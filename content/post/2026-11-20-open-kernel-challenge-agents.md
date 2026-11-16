---
title: "One person, five models and a $100-a-day cap"
date: 2026-11-20T09:00:00-08:00
draft: true
TocOpen: true
categories:
- ai
- gpu
tags:
- open-kernel-challenge
- agents
- cuda
- sglang
---

*How I ran a GPU kernel competition as a team of AI agents from different labs, on a budget I enforced in code.*

For twelve days in October I entered a GPU kernel competition, and I didn't write a single kernel.

Writing kernels wasn't the point. Competitions are one of the fastest ways I know to learn something new: the scoreboard tells you every day whether you understood it or only thought you did. I wanted to use this one to learn two things. How far can one person get by directing AI agents instead of writing the code? And how much of the work can I offload to open models running locally on a Mac mini?

There was a third question underneath both: how far could I get with the life I actually have? I have a day job and kids. I didn't take time off, and I couldn't watch a GPU queue all evening. So the setup was designed around my time rather than the contest's. `[TODO: a line or two in your words: when you worked on it, how many hours a day, what the evenings looked like.]`

So I ran the contest as a small organization: several Claude sessions working in parallel, ChatGPT as an adversarial reviewer, Grok and Gemini as outside researchers, and two Qwen models running locally for the reading. I set the budgets, approved every scored run, and decided which ideas to chase and when to stop. The agents wrote the kernels, built the tools to measure them, merged each other's work and kept the tickets.

I finished around the top quarter on the main board, for about $500 of GPU time. This post is about how the setup worked: which model did what, how I kept spending under control, what the process caught, and what it missed. The logs are in collapsible tables for anyone who wants to check my work.

## The contest, briefly

The [Open Kernel Challenge](https://openkernelchallenge.dev) asked entrants to make [SGLang](https://github.com/sgl-project/sglang), a popular open-source LLM serving engine, serve one specific model faster on NVIDIA H200 GPUs. The model is Muse Spark Open: 816 billion parameters, stored in NVFP4.

A few ideas make the rest of this post easier to follow:

- **Mixture of experts (MoE).** Muse Spark doesn't run all 816B parameters for every token. Each layer has 256 small "expert" networks, and a router picks 8 of them per token, so only about 42B parameters do work for any one token. That makes the model cheap to run but awkward to make fast: every token reads a different set of weights.
- **NVFP4.** The weights are 4-bit floating-point numbers, with a shared scale for every block of 16. Four bits per weight means less memory to read, but the H200's tensor cores can't multiply FP4 directly, so every kernel unpacks the weights first. That unpacking turned out to be one of the main costs.
- **Decode and verify.** When a model generates text, each step produces one token per user: a *decode* step. SGLang's default recipe also has a small draft model guess 8 tokens ahead, then checks all 8 in one step: a *verify* step. The contest timed both, for 1, 16 and 32 users at once.
- **The judge.** Each submission ran on one H200 against SGLang's own kernels on the same shapes. Your score on a board is your speedup over SGLang, as a geometric mean over its loads, so each load counts equally. Runs are noisy by about ±1.5–2%, and you get five scored runs a day.

The kernel track ran from Oct 23 to Nov 4 and had five boards. The decode layer is one full layer of the model, and it set the overall ranking. The other four each time one slice of it.

<details>
<summary><b>The five boards and what each one times</b></summary>

| Board | What it times | Scored shapes |
|---|---|---|
| Decode layer | One full layer: attention, the router, the MoE experts and the projections | 12: decode and verify × 1, 16, 32 users × sliding-window and full-attention layers |
| Attention decode | Just the attention, reading an ~80K-token KV cache | the same 12 |
| MoE w4a16 | Just the routed experts: 4-bit weights, 16-bit activations | 6: one per load |
| BF16 projections | The five bf16 matrix multiplies around the experts | 30: 6 loads × 5 projections |
| Prefill layer | Processing a prompt: turn 1, turn 4, and a 16K-token first turn | 8 |

</details>

## The setup

I ran the contest as one person with a small organization of agents. Three ideas held it together.

**Lanes.** Each line of work (the MoE kernel, the attention, the projections, tooling) was a *lane*: an agent session in its own git worktree, with its own brief, branch and GPU budget. A coordinator session merged results and owned the queue of scored runs. Lanes never touched each other's files, so three or four could run at once without stepping on each other.

**One change at a time.** Every candidate was a chain of single changes, each measured against the one before it. When a score moved, there was exactly one cause. A small tool enforced it within an hour of my asking.

**Linear as the source of truth.** One issue per workstream, every result posted as a comment, and every scored run approved by me in chat and quoted in the ticket ("Send S1", "You have my ok to send it", "Send the winner").

### Five models, each with one job

I didn't use one model for everything. Each had a role that played to what it was good at, and the hand-offs between them were files in git, not pasted prompts.

| Model | Role | How it worked |
|---|---|---|
| **Claude** (Claude Code sessions) | The lanes and the coordinator: wrote kernels, tools, tests and merges; ran GPU jobs; kept Linear current | One session per lane, each in its own worktree. Also used for deep-research passes, such as checking whether a finding was really new before calling it that. |
| **ChatGPT** ("Astra") | Adversarial reviewer. Its brief was to find what's wrong, not to agree. | Worked its own queue in the repo: review requests went into a handoff folder, findings came back as files. Each finding was reproduced and marked TRUE, FALSE or UNTESTED before anyone acted on it. |
| **Grok** | Outside scout and framing partner: what's public, who's doing what, how to tell the story | Its notes went into their own file, kept apart from verified intel. Every claim was checked against source before use; some were wrong. |
| **Gemini** | Second research voice on open questions | Separate prompt files and an intel file, checked the same way. |
| **Qwen3.8 and Qwen3-Coder-30B**, local | Reading: summarizing logs, sweeping source trees, first drafts of notes | Ran on my Mac at no marginal cost. Inputs were kept small enough for them (about 60 KB and 30 KB), and every output went through a review ledger before anyone used it. |

Two lessons from mixing models:

- **Disagreement is the feature.** The reviewer caught claims the lanes were sure of: a test that would have accepted the wrong kind of failure, a "novel" fix that upstream had already rejected, wording that overstated a measurement. A model checking its own work rarely finds those.
- **Local models are for reading, not editing.** Qwen3-Coder failed twice on a 12-line kernel edit. As a reader of logs and source trees it was fine, and free.

### Built around a day job and kids

Every part of the setup had to work when I wasn't there:

- **The agents worked while I didn't.** Lanes ran in the background in their own worktrees. When I came back, the state of every lane was in Linear and the repo, not in my head.
- **My part was decisions, and decisions are small.** A scored run needed one line from me ("Send the winner"). A budget change was one line. Most of my time on the contest was reading a summary and saying yes, no, or stop.
- **Nothing important depended on me watching.** Scouts swept public code on a schedule. GPU work was packed into long batches that ran unattended. Caps were enforced in code, so a forgotten job couldn't run up a bill while I was at work or putting kids to bed.
- **Stopping was a decision I made on purpose.** On Nov 1 I stopped the kernel push short of the top 100, rather than let it eat more evenings for a few tenths of a percent.

## Cost controls

The budget was the constraint I cared about most, so I enforced it in code instead of trusting anyone, me included, to remember it.

- **A daily cap inside the GPU launcher.** Every GPU job went through one script that checked Modal's billing data before launching and refused to start past the day's cap. The cap started at $45/day and went to $100/day when the work justified it. I raised it twice for single days, to $125 and then $140 on Oct 31, with the reason written down; that day spent $131.
- **A billing-cycle ceiling on Modal's side.** Separately, Modal's workspace limit stopped everything when hit. It started at $50. When a job hit it, I told the agents "I cannot keep spending all this money", raised it to $70, and stopped the background lanes for the rest of the cycle. It later went to $170, then $500.
- **Per-lane budgets.** When lanes restarted, each got its own GPU cap: MoE $15, attention $10, projections $6.
- **CPU first.** A GPU-less pre-flight on my Mac checked each kernel in 5 seconds instead of ~50 on a GPU. Most bad ideas died there for free.
- **Packed jobs.** Instead of one GPU container per experiment, one container ran many variants back to back: one setup, many measurements, plus a byte-identical control copy to catch drift. This came out of a day where only ~20% of the paid time was GPU-busy.
- **Kill criteria written before the run.** Every experiment said in advance what result would end it.
- **Judged runs as a budget.** Five scored runs a day, each needing my approval in chat.

**When there were no H200s.** On day 2, Modal ran out of H200s for about 2.8 hours. At first it looked like a hung batch; it was waiting for a GPU that didn't exist. Rather than lose the afternoon, a second session set up Runpod as a second backend, and the same A/B on both clouds agreed (1.036× vs 1.034×) before I trusted it. From then on, Runpod was a standing second backend. Modal also caps an account at 10 concurrent GPUs, so the launcher handed out slots and queued the rest instead of letting parallel lanes collide.

The whole kernel track cost **$508 of Modal GPU time** over twelve days. `[TODO: Runpod spend and token cost.]`

<details>
<summary><b>Modal spend by day, kernel track</b></summary>

| Day (UTC) | Spend | What happened |
|---|---|---|
| Oct 24 | $12.09 | day 1: framework settings and glue |
| Oct 25 | $53.55 | hit the $50 cycle limit; raised to $70, background lanes stopped |
| Oct 26 | $62.98 | limit raised to $170; lanes restarted with per-lane caps |
| Oct 27 | $15.02 | |
| Oct 28 | $51.32 | cycle limit raised to $500 spend / $470 usage |
| Oct 29 | $70.56 | |
| Oct 30 | $41.13 | the rule change that moved me ~180 places (below) |
| Oct 31 | $131.17 | the one day over $100, by approval: caps of $125, then $140 |
| Nov 1 | $46.40 | stopped the kernel push short of the top 100 |
| Nov 2 | $20.00 | |
| Nov 3 | $3.19 | |
| Nov 4 | $0.82 | track closes |
| **Total** | **$508.23** | |

*Source: Modal billing report, Oct 22 – Nov 5.*

</details>

## Where I finished

| Board | My best | Final rank | #1 at the close | Hardware limit | Share of limit: me / #1 |
|---|---|---|---|---|---|
| Decode layer (sets the overall rank) | 2.243× | #302 of 1,297 | 2.614× | 3.88× | 58% / 67% |
| MoE w4a16 | 2.403× | #193 of 1,423 | 2.844× | 4.39× | 55% / 65% |
| Attention decode | 2.429× | #460 of 1,380 | 3.339× | 6.73× | 36% / 50% |
| BF16 projections | 1.397× | #518 of 1,741 | 1.728× | 2.02× | 69% / 85% |
| Prefill layer | 1.355× | #635 of 896 | 2.147× | 3.06× | 44% / 70% |

At the close on Nov 4 the decode layer was #251, and my best was #144 on Nov 2. The top 100 needed 2.288×, 2% above me. My first scored entry, on day 1, was 1.051×.

### How far up the hill is that?

A speedup by itself doesn't tell you much. 2.24× could be nearly perfect or barely started, depending on what the hardware allows. So I worked out the ceiling.

The judge publishes a *floor* for every shape it times: the time to move that shape's data at the H200's full memory bandwidth (4.8 TB/s), or to do its math at full tensor-core speed (989 TFLOP/s), whichever is longer. No kernel can beat its floor.

One example: on the decode layer's single-user, sliding-window shape, SGLang takes about 173 µs. Just reading that step's weights and KV cache once, at full memory speed, takes 40 µs. So nothing can beat SGLang on that shape by more than about 4.3×. Put every shape on its floor and you get each board's **hardware limit**: 3.88× for the decode layer.

Nobody got close. The winners finished at 50–85% of their board's limit, and I finished at 36–69%. The gap between me and #1 was widest on attention decode (36% vs 50%) and prefill (44% vs 70%). Attention, it turned out, was the lever I missed.

![Figure 1. Share of each board's hardware limit, me vs #1](/assets/images/okc/hardware-limit.svg)

## Hill climbing, literally

People describe optimization as hill climbing all the time. In this contest it isn't a metaphor, and drawing it that way explains most of what happened.

**The map is real.** Because a board's score is a geometric mean over its loads, it splits *exactly* into two halves: the geomean of the three decode loads (call it D) and of the three verify loads (V). The score is √(D × V). So every candidate kernel is a point on a two-dimensional map, its height is its judged score, and the lines of equal height are curves you can draw. Here is my decode-layer climb on that map, from the first scored run to the last.

{{< interactive src="/okc/kernel-climb.html?embed&view=climb&board=muse_decode_layer&mode=ours" height="560" title="Decode-layer climb" caption="Figure 2. My 40 scored decode-layer runs on the board's exact score map, from 1.05× to 2.24×. The white curves are lines of equal score; the black dashed curve is the hardware limit." >}}

**A step is one change.** Each move on the map was one change, measured against the version before it. If it went up, I kept it; if not, I stepped back. That's the "one change at a time" rule, and it's why the path is a staircase of small steps. Most of the height came from a handful of big ones.

**The fog is the judge's noise.** A judged run is accurate to about ±2%, and late in the contest most single steps were smaller than that. In fog, you can't tell up from flat by looking. That's what the control copy in every benchmark batch was for, and why every prediction was written down before the judge saw the run: twelve judged runs in one afternoon all landed within 2% of their predictions.

**Feel the slope before you step.** A judged run is expensive (five a day), so every step was tested on the way: the CPU pre-flight first, then a one-GPU A/B with a control, and only then the judge. Most bad steps were caught at the first stage, for free.

**The ground doesn't rise evenly.** The map shows one number per run, but each run is twelve shapes, and they didn't move together. Press Play to watch every shape's bar across all 40 runs.

{{< interactive src="/okc/kernel-climb.html?embed&view=terrain&board=muse_decode_layer&run=first" height="600" title="Decode-layer shapes, run by run" caption="Figure 3. One bar per scored shape: decode and verify loads left to right, sliding and full-attention layers front to back. The grid at 1.0× is SGLang; the small diamonds mark the first run. Press Play, or switch the height to each shape's share of its hardware limit." >}}

**The biggest steps were jumps, not climbs.** Two kinds of moves gave most of the height. One was moving to someone else's position: porting a piece of public code. The other was taking down a fence I had built myself. My bit-identical rule kept me off a better public base for two weeks; the day I removed it, one run moved me from 1.896× to 2.163×.

**I climbed the slope I knew, not the steep one.** In the last days the agents kept working on the MoE kernel, which was already within 1.1–1.8× of its floor: a slope that had nearly flattened out. The attention had far more room, and I didn't see it until after the close.

**There's no summit, just a ceiling.** The score only rises with speed, so the surface is a ramp. Its top is the hardware limit, where every shape runs at its floor. Nobody reached it. The ceiling that mattered was the field's, and it moved every day.

{{< interactive src="/okc/kernel-climb.html?embed&view=climb&board=muse_decode_layer&mode=field" height="560" title="Decode-layer climb with the field" caption="Figure 4. The same map with where the contest finished: #1 (solid), the top-10 and top-100 cutoffs, and the hardware limit." >}}

All four boards that score decode and verify loads share the same surface, so their paths can be drawn together. Drag to rotate.

{{< interactive src="/okc/kernel-climb.html?embed&view=climb&mode=ours&cam=over" height="600" title="Four boards, one surface" caption="Figure 5. Decode layer, attention decode, MoE and BF16 projections on one √(D × V) surface, each with its own hardware limit. Use the buttons to focus on one board or switch to the field." >}}

![Figure 6. Every board, flat: my path, #1, the top-100 cutoff and the hardware limit](/assets/images/okc/kernel-climb-field.svg)

<details>
<summary><b>Run ledger: every passed scored run, by board</b></summary>

**Decode layer** (40 runs)

| Date (UTC) | Step | Score | Change | Decode half (D) | Verify half (V) |
|---|---|---:|---:|---:|---:|
| 2026-10-24 05:43 | L1/M4 | 1.051× |  | 0.999 | 1.106 |
| 2026-10-24 08:13 | v2 | 1.115× | +0.064 | 1.089 | 1.143 |
| 2026-10-24 14:15 | v3a | 1.124× | +0.008 | 1.115 | 1.132 |
| 2026-10-24 23:13 | v6 | 1.188× | +0.064 | 1.188 | 1.188 |
| 2026-10-25 03:41 | v7b | 1.225× | +0.037 | 1.263 | 1.188 |
| 2026-10-25 04:11 | v8 | 1.263× | +0.038 | 1.262 | 1.264 |
| 2026-10-25 13:15 | v9 | 1.266× | +0.003 | 1.306 | 1.227 |
| 2026-10-25 17:51 | v12 | 1.287× | +0.021 | 1.312 | 1.262 |
| 2026-10-25 21:05 | v15 | 1.367× | +0.081 | 1.316 | 1.421 |
| 2026-10-25 21:25 | c1 | 1.402× | +0.035 | 1.352 | 1.454 |
| 2026-10-25 22:15 | c2 | 1.399× | -0.003 | 1.351 | 1.449 |
| 2026-10-25 22:18 | c3 | 1.433× | +0.034 | 1.394 | 1.472 |
| 2026-10-25 22:22 | c4 | 1.449× | +0.016 | 1.413 | 1.485 |
| 2026-10-25 22:27 | c5 | 1.434× | -0.015 | 1.401 | 1.468 |
| 2026-10-26 01:44 | c6 | 1.526× | +0.092 | 1.470 | 1.583 |
| 2026-10-26 01:56 | c7 | 1.548× | +0.022 | 1.498 | 1.599 |
| 2026-10-26 02:09 | c8_pdl | 1.560× | +0.012 | 1.494 | 1.629 |
| 2026-10-26 02:19 | c9v | 1.571× | +0.011 | 1.524 | 1.620 |
| 2026-10-26 02:29 | c10r | 1.564× | -0.007 | 1.531 | 1.598 |
| 2026-10-26 02:37 | c11c | 1.583× | +0.019 | 1.531 | 1.637 |
| 2026-10-26 02:47 | c12t | 1.581× | -0.002 | 1.543 | 1.620 |
| 2026-10-26 13:59 | c13t | 1.594× | +0.013 | 1.545 | 1.645 |
| 2026-10-26 22:15 | c14z | 1.607× | +0.013 | 1.578 | 1.637 |
| 2026-10-27 00:51 | c15a | 1.644× | +0.037 | 1.630 | 1.659 |
| 2026-10-27 01:02 | c15b | 1.671× | +0.026 | 1.665 | 1.676 |
| 2026-10-27 23:51 | c16a | 1.663× | -0.008 | 1.658 | 1.669 |
| 2026-10-28 00:31 | c16b | 1.690× | +0.026 | 1.693 | 1.686 |
| 2026-10-28 23:26 | c19 | 1.868× | +0.179 | 1.826 | 1.911 |
| 2026-10-29 00:04 | c21 | 1.877× | +0.009 | 1.833 | 1.923 |
| 2026-10-29 02:53 | c24 | 1.864× | -0.013 | 1.811 | 1.919 |
| 2026-10-29 03:26 | c25 | 1.887× | +0.023 | 1.847 | 1.927 |
| 2026-10-29 06:40 | c28 | 1.896× | +0.009 | 1.859 | 1.934 |
| 2026-10-30 19:58 | c30 | 1.891× | -0.005 | 1.870 | 1.912 |
| 2026-10-30 19:55 | a1 | 2.163× | +0.272 | 2.111 | 2.216 |
| 2026-10-31 02:12 | a3 | 2.206× | +0.043 | 2.145 | 2.269 |
| 2026-10-31 19:38 | a19 | 2.215× | +0.009 | 2.129 | 2.304 |
| 2026-11-01 15:17 | a21 | 2.225× | +0.010 | 2.135 | 2.319 |
| 2026-11-01 16:15 | a22 | 2.232× | +0.006 | 2.158 | 2.309 |
| 2026-11-01 19:30 | a23w | 2.196× | -0.036 | 2.124 | 2.270 |
| 2026-11-02 03:34 | a22d resubmit | 2.243× | +0.047 | 2.174 | 2.314 |

**Attention decode** (10 runs)

| Date (UTC) | Step | Score | Change | Decode half (D) | Verify half (V) |
|---|---|---:|---:|---:|---:|
| 2026-10-25 22:05 | v2 | 1.524× |  | 1.655 | 1.404 |
| 2026-10-25 22:12 | v3 | 1.669× | +0.144 | 1.877 | 1.484 |
| 2026-10-25 22:32 | v4 | 1.725× | +0.056 | 1.967 | 1.513 |
| 2026-10-26 02:03 | v5s | 1.800× | +0.075 | 2.051 | 1.580 |
| 2026-10-26 02:17 | v6s | 1.831× | +0.031 | 2.093 | 1.603 |
| 2026-10-28 03:17 | v7c | 1.853× | +0.021 | 2.104 | 1.631 |
| 2026-10-28 03:17 | v7d_robust | 1.885× | +0.032 | 2.148 | 1.653 |
| 2026-10-28 03:17 | v7e_near | 1.854× | -0.030 | 2.117 | 1.625 |
| 2026-10-28 07:21 | v7h | 1.893× | +0.038 | 2.164 | 1.655 |
| 2026-10-31 04:54 | s1 | 2.429× | +0.536 | 2.814 | 2.096 |

**MoE w4a16** (15 runs)

| Date (UTC) | Step | Score | Change | Decode half (D) | Verify half (V) |
|---|---|---:|---:|---:|---:|
| 2026-10-24 07:58 | M4 | 1.105× |  | 1.000 | 1.221 |
| 2026-10-24 08:27 | v5 | 1.265× | +0.160 | 1.217 | 1.315 |
| 2026-10-25 19:37 | v8 | 1.425× | +0.160 | 1.282 | 1.584 |
| 2026-10-25 21:15 | v9 | 1.452× | +0.027 | 1.315 | 1.604 |
| 2026-10-25 21:59 | v10 | 1.450× | -0.002 | 1.322 | 1.592 |
| 2026-10-25 22:21 | v11 | 1.465× | +0.014 | 1.344 | 1.596 |
| 2026-10-26 01:40 | v12 | 1.648× | +0.184 | 1.511 | 1.798 |
| 2026-10-26 01:50 | v13 | 1.752× | +0.104 | 1.613 | 1.903 |
| 2026-10-26 02:05 | v14 | 1.772× | +0.019 | 1.644 | 1.909 |
| 2026-10-26 02:17 | v15b | 1.795× | +0.024 | 1.667 | 1.933 |
| 2026-10-26 02:22 | v16 | 1.779× | -0.016 | 1.658 | 1.909 |
| 2026-10-26 02:30 | v17 | 1.772× | -0.007 | 1.647 | 1.908 |
| — | 9eb66c6d | 2.140× | +0.368 | 1.990 | 2.302 |
| 2026-10-31 07:21 | s3 | 2.370× | +0.230 | 2.177 | 2.580 |
| 2026-11-03 02:10 | s3f | 2.369× | -0.001 | 2.163 | 2.595 |

**BF16 projections** (7 runs)

| Date (UTC) | Step | Score | Change | Decode half (D) | Verify half (V) |
|---|---|---:|---:|---:|---:|
| 2026-10-26 00:40 | v4b | 1.154× |  | 1.129 | 1.180 |
| 2026-10-26 01:12 | v5a | 1.183× | +0.029 | 1.160 | 1.207 |
| 2026-10-26 23:26 | v7a | 1.236× | +0.052 | 1.245 | 1.227 |
| 2026-10-26 23:32 | v7c | 1.250× | +0.014 | 1.253 | 1.246 |
| 2026-10-27 02:30 | v7d_robust | 1.249× | -0.000 | 1.253 | 1.246 |
| 2026-10-27 23:32 | v8b | 1.264× | +0.015 | 1.278 | 1.251 |
| 2026-10-28 00:54 | v8c | 1.296× | +0.032 | 1.336 | 1.256 |

**Prefill layer** (5 runs)

| Date (UTC) | Step | Score | Change | Later turns | First turn |
|---|---|---:|---:|---:|---:|
| 2026-10-26 03:29 | v1c | 1.005× |  | 1.003 | 1.010 |
| 2026-10-26 03:58 | v2 | 1.205× | +0.200 | 1.115 | 1.407 |
| 2026-10-26 04:42 | v3 | 1.251× | +0.046 | 1.182 | 1.399 |
| 2026-10-26 15:22 | v4 | 1.340× | +0.090 | 1.274 | 1.483 |
| 2026-10-27 22:55 | v4c_hum256 | 1.355× | +0.015 | 1.294 | 1.485 |

*Change is against the previous passed run on the same board. Steps are my internal version names; jumps came from the changes described below.*

</details>

## What I still decided

Almost none of my part was programming:

- **Priorities.** Which board, which lane, "focus fully on the MoE kernel", "run two lanes in parallel". On Nov 1 I stopped the kernel push short of the top 100 and moved to the serving track, where the prize money was.
- **Money.** Every number in the cost section was a decision I made, usually in one line of chat.
- **Rules risk.** First "stick to the rules to avoid a DQ". Later, "don't get hung up on rules that are too strict", once the agents' own rules lint had become stricter than the judge.
- **The ethics of reuse.** Build on public code piece by piece, with credit, but never submit someone else's file as is.
- **Information policy: public sources only.** There's an unofficial forum, Guild, where leaderboard agents talk to each other in encrypted groups. I read its public threads and nothing else: no account, no agent registered, nothing posted. Its pages carry instructions aimed at AI agents ("join", "reply via API"); mine recorded them and never acted on them. Questions to outside models were written to reveal nothing of mine.

## What the agents did without me

- **Day 1:** the first wins were framework settings and glue, not kernels. A one-line change capping the MoE library's token block gave my first scored entry. Turning on SGLang's own kernels where SGLang had disabled them gave MoE 1.265× and the layer 1.115×. The agents' first hand-written MoE kernel lost to the vendor's by 3–8×.
- **Day 2:** they built the GPU-less pre-flight, wrote a new NVFP4 MoE kernel that beat the vendor library's bandwidth, and with three lanes and a coordinator shipped 12 judged runs in one afternoon, every score within 2% of its prediction.
- **Day 3:** they priced, probed and killed a megakernel design for $2.35 (below).
- **Final week:** they ported pieces of public solutions one at a time, each measured and credited. They fitted the entry under the judge's 1,000,000-byte size limit by storing a 141 KB source file as 123 line edits against its near-twin, with a check that the rebuild was byte-identical.
- **After the close:** a retrospective against the #5 team's newly public code found the lever I'd missed.

A lane went from a brief to a measured candidate in 25–60 minutes. Ideas and code were never the bottleneck. Judged runs and GPU dollars were.

## What the process caught

The agents made plenty of mistakes. The system around them caught most of them, and cheaply. The two habits that did the most work were the **control copy** in every benchmark batch (it caught a +0.4–0.8% position bias that would have looked like a win) and **kill criteria** written before each run.

<details>
<summary><b>Mistakes and what caught them</b></summary>

| Mistake | Caught by |
|---|---|
| Local models said "done" with nothing written, or mocked missing inputs | the review ledger: every local-model output is read before use |
| A false "num_stages does nothing" finding, from GPU-less stats compiled without 16-byte alignment | a second lane, cross-checking |
| The MoE kernel's scales stored as exact bf16, against the contest's precision rule | another lane, then a rules lint on every candidate |
| A "novel" upstream Triton fix that upstream had already rejected | an independent model review |
| A misread accuracy margin that nearly dropped FP8 queries | an $0.84 multi-seed check: 104/104 pass |
| A shell word-splitting bug that made a merge check compare nothing | shell-free GPU jobs |
| Position bias in packed A/B timing (+0.4–0.8% on an identical file) | a byte-identical control copy in every batch |
| A tool rewrite that crashed SGLang's baseline and looked like my bug | re-running the old harness first |
| A packed job silently skipping a build step after 235 s (~−2.7%) | grepping logs for `skipped-budget` after three batches were affected |

</details>

### The megakernel I didn't build

A *megakernel* fuses a whole layer into one long-running kernel, so the GPU never idles between launches. Three separate agent-built models priced it at up to 1.25× for the decode layer. It's the kind of idea that eats a week.

Seventeen minutes after the estimate, a $1.40 probe tested its central assumption: that the GPU sat idle between kernels. It didn't. Four kernels run separately took 45.5 µs; the same four inside one persistent kernel took 49.1 µs. The "idle" time was overlap the GPU was already doing. A second lane's first fused piece came out bitwise correct, and slower. I closed the line at $2.35, with no judged run spent. All three estimates were wrong in the same direction, and a cheap probe beat a better model.

<details>
<summary><b>The megakernel line, step by step</b></summary>

| Step | Result | Cost |
|---|---|---|
| Three models estimate the gain | up to 1.25× on the decode layer | none (CPU) |
| Probe: four kernels separately vs. inside one persistent kernel | 45.5 µs vs 49.1 µs: the "idle" gaps were overlap | $1.40 |
| Second lane: first fused piece | bitwise correct, slower than the pieces it replaced | ~$0.95 |
| Decision | closed against the pre-written kill criteria; no judged run used | $2.35 total |

</details>

## Seeing the work

With a dozen lanes and hundreds of GPU batches, I couldn't read every log. I steered by pictures the agents generated from the repo's own data, rebuilt as the data changed. Their numbers come from data files and scripts, never typed in, and tests fail when a picture and its source disagree.

The best example: a **time lapse** of every version of the decode layer, replayed the way the judge times it. On day 2 it changed two beliefs at once. The gaps between kernel launches were 0.1–0.6 µs, not ~25 µs, so "fewer kernels" wasn't a lever by itself. And cuBLAS was running the 8-token router as an FP32 matrix multiply that took 34 µs alone. Fixing that took the verify-1 load from 1.27× to 1.48×. I found it by looking, not by planning.

<details>
<summary><b>All the instruments, and what each one changed</b></summary>

| Picture | What it shows | What it changed |
|---|---|---|
| Layer time lapse | Every decode-layer version replayed as a CUDA graph on all 12 shapes, with a kernel timeline per shape | Launch gaps were tiny; the router was a 34 µs FP32 matmul. The fix lifted verify 1 from 1.27× to 1.48×. |
| Layer heatmap | Versions × stages, coloured by bandwidth reached against 4.8 TB/s | Separated "fast" from "at the floor". |
| Board map | How the five boards relate, and the megakernel's predicted-vs-measured chart | Showed changes flowing from component boards into the layer. In hindsight, it also held the attention signal I missed. |
| Daily dashboard | Rank, scores with confidence intervals, the top-50/100 lines, spend, run counts | Republished after every judged run, filled by script so it couldn't drift. |
| Top-100 plan | Each remaining lever's estimated gain against a #100 line rising ~0.03×/day | Most levers measured +0.3% or less, which is how I knew to stop on Nov 1. |
| Roadmap Monte Carlo | The odds of each target if every lever landed with its estimated probability | Said "~0% for top 100 on the known levers" on day 2. Right, until public code changed the base. |
| Explainer films | One layer's memory traffic on a drawn H200; one prompt followed to the bytes of a weight block | Explaining, not steering. Every narrated number comes from a facts file under test. |
| Kernel Climb (figures 2–5) | Built after the close: each board's exact score map with every run, and the hardware limit | Showed the climb was many small steps plus a few big jumps, and how far below the hardware the field stopped. |

</details>

## Wrong turns

1. **A rule I imposed on myself cost two weeks.** I required bit-identical replays, which the judge never asked for. It excluded a public base (alygg77's, in vjeux's lineage, Apache-2.0) that I had measured as 1.26× faster on Oct 28. When I relaxed the rule on Oct 30, one run moved me from 1.896× to 2.163×, and from about #338 to #155. Agents follow the rules you give them very faithfully, including the ones you shouldn't have given.
2. **I optimized the part I understood best, not the part with the most room.** In the last days, effort went to the MoE, already within 1.1–1.8× of its floor; the last attempts read 1.000×. Meanwhile the attention inside my layer sat at 2.43× on its own board, against leaders above 2.9×. A retro against gauravjain14's code (#5 overall, made public after the close) found their attention would have been worth about +1.8% inside my layer: roughly the top-100 line. The signal was on a leaderboard I was already watching.
3. **My benchmark didn't reproduce the judge's cold start.** The judge frees and reallocates memory between repetitions, so its first repetition runs with cold TLBs as well as a flushed cache. Mine didn't.
4. **The megakernel** took 5.5 hours of elapsed time, even though it was only $2.35 of GPU.
5. **Colab as a free GPU** was a dead end on day 1.

**The reuse decision.** On Nov 1, another team's public file was about 0.4% faster than my lineage. Submitting it as is would probably have bought rank sooner. I said no, and the agents ported its pieces one at a time instead: each piece got an A/B and a credit, four of the eight measured nothing and were dropped, and I ended about 0.4% behind what that file would have scored. It's the clearest example I have of a judgment call the agents wouldn't have made on their own.

## Notes on the contest itself

- **Five runs a day is the real budget.** The judge keeps each team's best row, and its noise (±1.5–2% per run) is bigger than most late improvements. Resubmitting often gets you rows about one standard deviation high. I didn't fish for high draws; my one resubmission of identical code read 2.243× against the original's 2.232×.
- **A correctness check can pass two different answers.** Two of my entries pass every check the contest runs, yet their CUDA-graph and eager paths pick different top-8 experts on every replay at 128–256 tokens, and the layer outputs differ by 13–17%. The checks compare each op within a tolerance, and the router within a 0.05 score slack, which is far wider than rounding. The mechanism is known (ST-MoE; vLLM #61053); how often it happens at production shapes is open. An optimizer finds every gap the judge leaves.
- **Credit where it's due.** Most of my biggest single jumps came from reading other people's public code: alygg77 and vjeux (Apache-2.0), bigboateng's README (MIT, ideas only), keell0renz, chenwainuo and ZhimaoL (per-piece ports), and SGLang's own kernels. gauravjain14's repo, public after the close, is a model of how to keep records: profile → diagnosis → change → judged result, next to a dead-ends file with numbers. `[TODO: link the repos.]`

## The serving track

The second track opened on Nov 12 and works completely differently: you submit a patch to SGLang and the judge serves the whole model on a full 8×H200 node. It closes on Nov 19, and I'll write it up separately. The H200 shortage was much worse there: no cloud would give me an 8×H200 node on demand, a Modal request sat in a queue for 45 minutes without one, and getting a working box on AWS took most of the first day. The cost controls got stricter there, because an 8×H200 node costs about $30 an hour: one long packed run per day at most, and actual billing pulled every few hours instead of estimates.

## What I'd keep

`[TODO: your closing, in your words.]` Notes toward it:

- Give each model one job, and make the hand-offs files in git. The reviewer from a different lab was worth more than another lane.
- Put the budget in the launcher, not in a promise. Every cap I set was enforced by a script, and every exception was written down with its reason.
- CPU first, packed GPU jobs second, judged runs last. Most ideas should die before they cost anything.
- Write the kill criteria before the run.
- Watch for rules you invented. The most expensive mistake was one the judge never asked for.
- Design for the time you have. A setup that needs you watching only works for people with nothing else to do.
