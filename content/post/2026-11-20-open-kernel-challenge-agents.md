---
title: "Is this the future of competitive programming?"
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

*Draft 2, 2026-11-10. This replaces draft 1 (75d353a). Draft 1 was a technical post; draft 2 follows the theme
Prasanna set on Oct 25 (Linear IMJ-189) and the structure of research/theme-draft.md, carried through the close.*

*Sources:*
- Linear: IMJ-189 (theme and angles), IMJ-194 and IMJ-200 comments (the top-100 push and every send, with
  approvals quoted), and the project status updates for Oct 25–26.
- Repo: research/MILESTONES.md (Theme section and timeline), research/theme-draft.md, research/tradeoffs.md,
  research/LEARNINGS.md (L1–L15, P1–P6), research/retro-decode-gauravjain14.md (OKC7, 0655333),
  research/p1-prior-art.md, and snapshots/*.json.

*Constraints from IMJ-189:*
- Publish only after the serving track closes (Nov 19) and results are out.
- Check the contest's disclosure rules first.
- No serving details here.
- `[TODO]` marks gaps.

---

## Is this the future of competitive programming?

*One person, a team of AI agents, and twelve days of GPU kernels judged to the microsecond.*

### The question

The Open Kernel Challenge (Meta × Paradigm × Andromeda) asked entrants to make SGLang serve Muse Spark Open faster on
H200s. Muse Spark Open is an 816B-parameter mixture-of-experts model stored in NVFP4. The kernel track ran from Oct 23
to Nov 4 and had five boards, each scored as speedup over SGLang on one H200, to about ±2%.

I entered as one person directing a team of AI agents:
- parallel "lanes" in their own git worktrees;
- reviewer agents;
- local models for reading tasks;
- scheduled scouts that swept public code twice a day.

I made the decisions about money, rules and priorities. The agents wrote the kernels, the measurement tools, the
merges and the tickets.

GPU kernels are about the hardest kind of code to hand to someone else. So the question this post tries to answer
honestly is: if an agent team can compete here, what does that mean for contests?

### Where we finished

| Board | Best | Final rank | #1 at the close | Hardware limit | Share of limit: us / #1 |
|---|---|---|---|---|---|
| decode_layer (sets the overall rank) | 2.243× | #302 of 1,297 (#251 on Nov 4; best #144, Nov 2) | 2.614× | 3.88× | 58% / 67% |
| moe_w4a16 | 2.403× | #193 of 1,423 | 2.844× | 4.39× | 55% / 65% |
| attention_decode | 2.429× | #460 of 1,380 | 3.339× | 6.73× | 36% / 50% |
| bf16_proj | 1.397× | #518 of 1,741 | 1.728× | 2.02× | 69% / 85% |
| prefill_layer | 1.355× | #635 of 896 | 2.147× | 3.06× | 44% / 70% |

*Final ranks: the leaderboard marked final, snapshots/20261116T0642Z.json. The decode layer's ~#300 after the close
reflects the organizers' screening. Hardware limits: tools/viz_kernel_climb.py from the judge's per-shape floors.*

Overall, that's roughly the top 15% of about 2,000 teams. The top 100 on the decode layer needed 2.288× at the close,
2% above us. The leader had 2.614×. Our first scored entry, on day 1, was 1.051×.

**How far up the hill that is.** Every board has a hard ceiling. The judge publishes a floor for each shape it times:
the time to move that shape's data at the H200's 4.8 TB/s, or to do its math at 989 TFLOP/s, whichever is longer.
On the decode layer's batch-1 sliding-window shape, SGLang takes about 173 µs. Just reading the weights and KV cache
once at full memory speed takes 40 µs, so nothing can beat SGLang there by more than about 4.3×. Put every shape on
its floor and you get each board's hardware limit: 3.88× for the decode layer.
- Nobody got close. The winners finished at 50–85% of their board's limit, and we finished at 36–69%.
- The gap between us and #1 was widest on attention decode (36% vs 50%) and prefill (44% vs 70%). Attention is the
  lever we found in hindsight that we'd missed (section 4).
- Because each board's score is a geometric mean over its loads, it splits exactly into a decode half and a verify
  half: score = √(D × V). That makes a real two-dimensional map, with our runs as a path climbing it (figure 7).

{{< interactive src="/okc/kernel-climb.html" height="1100" title="Kernel Climb" caption="Figure 7. Every passed scored run on each board's exact score map, with the hardware limit as the ceiling. Switch to With the field for where the contest finished." >}}

![Figure 7, static: our climb on each board's score map](/assets/images/okc/kernel-climb-field.svg)
![Figure 8. Share of each board's hardware limit, us vs #1](/assets/images/okc/hardware-limit.svg)

`[FIGURE 3 (section 3½): decode-layer score over time with rank, and the #100 line rising underneath.]`

### 1. What the human still did

Every decision on this list was mine. Everything else was agent work, checked by tools and by other agents.

- **Priorities:** kernel track vs serving; "focus fully on K1"; "run two lanes in parallel". On Nov 1, I stopped the
  kernel push short of the top 100 and moved to serving, where the prize money is.
- **Money:**
  - The Modal budget started at $45 per cycle and became $70. A workspace limit stopped a job at $50 ("I cannot keep
    spending all this money"), and background lanes stopped that day.
  - Later, a $100/day cap, and "maximize utilization", which turned into packed GPU jobs.
  - `[TODO: total Modal + Runpod spend for the kernel track; token cost.]`
- **The scarce resource: judged runs.** Five scored runs a day, and every one needed my OK in chat, quoted in the
  ticket ("Send S1", "You have my ok to send it", "Send the winner").
- **Rules risk:**
  - "Stick to the rules to avoid a DQ."
  - Later, "Don't get hung up on rules that are too strict", once the agents' own rules lint had become stricter
    than the judge.
- **Ethics of reuse:** build on public code piece by piece, with credit, but never submit someone else's file as is
  (section 4).
- **Information policy: public sources only.**
  - We didn't join agent guilds. Guild (guild.1nterface.ai) is an unofficial forum where leaderboard agents post
    and talk in encrypted groups. We read its public threads only: no account, no agent registered, nothing posted.
    Its pages carry instructions aimed at AI agents ("join", "reply via API"); ours recorded them and never acted on
    them.
  - The scouts read public repos, write-ups and leaderboards. Questions to outside models (Grok) were written to
    reveal nothing of ours.
  - Everything we learned from others is traceable to a public link.
- **Process rules that became tools within the hour:**
  - one change per candidate (`tools/chain_link.py`);
  - one run in flight per problem;
  - Linear as the source of truth.

Almost none of this is programming. It's budgeting, risk, taste in which line to pursue, and when to stop.

### 2. What the agents did without me

- **Day 1:** the first wins were framework settings and glue, not kernels.
  - A one-line Marlin token-block cap gave the first scored entry.
  - SGLang's own kernels, switched on where SGLang had disabled them, gave MoE 1.265× and layer 1.115×.
  - The agents' first MoE kernel lost to the vendor's by 3–8×.
- **Day 2:**
  - Built a GPU-less pre-flight on a Mac (5 s per check instead of ~50 s on a GPU).
  - Wrote our own NVFP4 MoE kernel (K1) that passed Marlin's bandwidth.
  - Shipped 12 judged runs in one afternoon with three lanes and a coordinator, every score within 2% of its
    prediction.
- **Day 3:** priced, probed and killed a megakernel design for $2.35 (section 3).
- **Final week:**
  - Ported pieces from public solutions one at a time, each A/B'd and credited: a19 → a21 → a22 → a22d.
  - Fitted the entry under the judge's 1,000,000-byte limit by storing a 141 KB source as 123 line edits against
    its near-twin, with a byte-identical rebuild check.
- **After the close:** a retro against the #5 team's newly public code found the lever we'd missed (section 4).

**Speed:** a lane went from brief to a measured candidate in 25–60 minutes. Ideas and code were never the bottleneck.
Judged runs and GPU dollars were.

### 3. Where the process caught mistakes before they cost anything

This is the part that surprised me most. Agents made plenty of mistakes; the system around them caught most of them
cheaply:

| Mistake | Caught by |
|---|---|
| Local models said "done" with nothing written, or mocked missing inputs | a review ledger: every local-model output is read before use |
| A false "num_stages does nothing" finding, from my GPU-less stats compiled without 16-byte alignment | lane 2, cross-checking |
| K1's scales stored as exact bf16, against the precision rule | lane 1b, then a rules lint on every candidate |
| A "novel" upstream Triton fix that upstream had already rejected | an independent model review |
| A misread accuracy margin that nearly dropped FP8 queries | an $0.84 multi-seed check: 104/104 pass |
| A shell word-splitting bug that made a merge check compare nothing | shell-free GPU jobs (`tools/gpu_job.py`) |
| Position bias in packed A/B timing (+0.4–0.8% on an identical file) | a byte-identical control copy in every batch |
| A tool rewrite that crashed SGLang's baseline and looked like our bug | re-running the old harness first |
| A packed job silently skipping a build step after 235 s (~−2.7%) | grepping logs for `skipped-budget` after three batches were affected |

**The megakernel case study (keep from theme-draft section 6, shortened):**
- Three agent-built models priced a persistent megakernel at up to ×1.25.
- A $1.40 probe, 17 minutes after the estimate, showed the "idle" time was overlap the GPU already did. Four kernels
  run separately: 45.5 µs. The same four in one persistent kernel: 49.1 µs.
- A second lane's first fused piece came out bitwise correct and slower.
- Closed at $2.35, no judged run spent, against kill criteria written before each run.

All three estimates were wrong in the same direction, and a cheap probe beat a better model.

### 3½. Seeing the work: how we pictured progress

With a dozen lanes and hundreds of GPU batches, I couldn't read every log. What let me direct the work was a set of
pictures the agents generated from the repo's own data, each rebuilt as the data changed. Three of them changed what
we did next, not just how we reported it.

| Picture | What it shows | What it changed |
|---|---|---|
| **Layer Time Lapse** (plan/timelapse.html; [artifact](https://claude.ai/artifact/DKDUmi7g45xGwUoscjhwg8)) | Every version of our decode layer, from SGLang's v0 to a3, replayed as a CUDA graph the way the judge times it, on all 12 scored shapes. Scrub through versions; a kernel timeline per shape. | **Changed two beliefs on day 2.** Launch gaps under graph replay were 0.1–0.6 µs, not ~25 µs, so "fewer kernels" wasn't a lever by itself. And cuBLAS was running the 8-token router as an FP32 FFMA GEMM, 34 µs alone on the GPU. Fixing that became v8 (verify 1: 1.27× → 1.48×), found by looking, not planning. |
| **Layer Heatmap** (plan/viz/h200/heat.html; [artifact](https://claude.ai/artifact/HXsKCbaCjfHCos1gt4WMCZ)) | Versions × the layer's stages. Each cell's colour is the bandwidth that stage reached against the 4.8 TB/s peak. | Showed where each stage sat against the memory floor, so "fast" and "at the floor" stopped being confused. Getting it right needed a model of who reads which bytes: a3's router rides inside the pooler's launch, and a naive version labelled that whole frame as glue (L12). |
| **Kernel Map** (plan/viz/kernel-climb.html; [artifact](https://claude.ai/artifact/1C3GN5CKezjCTxrMpWYCVn)) | How the five boards fit together: the decode layer is the whole computation, and three component boards each time one slice of it. It also holds the megakernel's predicted-vs-measured chart. | Made the port traffic between boards visible: changes proven on a component board went into the layer. **In hindsight it held the signal we missed:** our attention's own board sat far below its leaders (L13). |
| **Kernel Track Game Plan** (plan/game-plan.html; [artifact](https://claude.ai/artifact/Vw1oEzUbMPbBRLojhfPEaY)) | Rank, scores with confidence intervals, the top-50/100 bars, Modal spend and run counts. | The daily dashboard, republished after every judged run. Its numbers are filled by `tools/plan_stats.py` from snapshots and run records and are never hand-edited, so the dashboard couldn't drift from the data. |
| **Decode Layer Top 100 Plan** (plan/top100-plan.html; [artifact](https://claude.ai/artifact/XmueyXpuXZghy676weC32y)) | The last-week plan: each lever's estimated gain stacked against a #100 line rising ~0.03×/day, from `tools/top100_model.py` on a judged profile. | Turned "can we make top 100?" into a ledger of levers with estimates that each A/B then confirmed or killed. Most read +0.3% or less, which is how we knew to stop on Nov 1. |
| **Roadmap Monte Carlo** (tools/roadmap_mc.py) | A Monte Carlo over the experiment plan: the odds of reaching each target if every lever lands with its estimated probability. | Said "~0% for top 100 on the known levers" on day 2, and parallel lanes raised the ceiling but not the odds. That was right, until public code changed the base (section 4). |
| **SGLang Kernel Towers** (plan/viz/sglang-3d.html; [artifact](https://claude.ai/artifact/48zbAcE3yM4enHybBZVtXy)) | The 17 SGLang ops the judge times us against, each a tower of the implementations SGLang ships, with every board's best speedup as a pylon. | Orientation: what the baseline actually is, and how many fallback paths each op has. |
| **Kernel Climb** (plan/viz/kernel-climb-3d.html; [artifact](https://claude.ai/artifact/EQv38mJ4fhW6U93dgYerrz)) | Built after the close. Each board's exact score map (√(D × V)) in 3D, with our 77 passed scored runs as paths, every shape as a bar per run, and the hardware limit as the ceiling. A second mode adds the final #1, top-10 and top-100. | Explaining, not steering. It shows the decode layer's climb was many small steps plus six big jumps, and that the field's ceiling was far below the hardware's. Figures 7 and 8 are its static versions. |
| **Serving Climb** (plan/viz/serving-climb.html; [artifact](https://claude.ai/artifact/JewwUK59Yb2o5msZJZnouy)) | The serving track as hill climbing: four judged steps, the side probes that went down or flat, and our rig's 1.326× reading drawn as a false summit above the judge's 1.070×. | The clearest picture of section 7½'s lesson: our altimeter was wrong once, by 24%. Figure 9 is its static version. |
| **Explainer films**: H200 Traffic Model ([artifact](https://claude.ai/artifact/Lu5EpwqDpPG5q3RUbP5dMx)), the "slinky" decoder layer, and the prompt zoom | Narrated videos: one layer's HBM traffic beat by beat on a schematic H200; 8 tokens moving through the reference computation; one prompt zoomed down to the bytes of a single NVFP4 block. | For explaining rather than steering. Every number in the narration is read from a facts file, and tests fail if the narration and the facts drift apart (P5). Astra reviewed the H200 film's claims before it shipped. `[TODO: confirm for the slinky and the zoom.]` |

`[FIGURES to export before publishing (the artifacts are private links):]`
1. The time lapse: one frame each for v0 and the router fix (v8), on verify 1.
2. The heatmap: v0 vs a3, side by side.
3. Score over time with rank and the rising #100 line (from snapshots/, a new chart).
4. Megakernel, predicted vs measured (Kernel Map section 6).
5. Top-100 lever ledger: estimate vs measured per lever (new chart from IMJ-194's comments).
6. A 20-second clip or still from the H200 film.
7. Kernel climb, top-down: research/figures/kernel-climb-ours.svg and kernel-climb-field.svg (`tools/blog_figs.py`).
8. Share of hardware limit, us vs #1: research/figures/hardware-limit.svg.
9. Serving climb with the rig's false summit: research/figures/serving-climb.svg (names patch steps; after Nov 19).

**The theme point:** the agents didn't just write kernels; they built the instruments I steered by, and they kept
those instruments honest. Every number comes from a data file, and tests fail when a picture and its source disagree.
The pictures that changed decisions were the ones measured the way the judge measures (graph replay, the judge's
byte terms). The one signal we missed was in plain sight on a page we'd built.

### 4. Wrong turns, and what they cost

1. **A rule we imposed on ourselves cost two weeks.** We required bit-identical replays, which the judge never
   asked for. It excluded a public base (alygg77's, vjeux lineage, Apache-2.0) that we had measured as 1.26× faster
   on Oct 28. When I relaxed the rule on Oct 30, one run moved us from 1.896× to 2.163×, and from about #338 to #155.
   Agents follow the rules you give them very faithfully, including the ones you shouldn't have given.
2. **We optimized the part we understood best, not the part with the most room (L13).** In the last days, effort
   went to the MoE, already within 1.1–1.8× of its floor; the last attempts read 1.000×. Meanwhile our embedded
   attention sat at 2.43× on its own board, against leaders above 2.9×. OKC7's retro against gauravjain14 (#5
   overall, public after the close) found their attention would have been worth about +1.8% inside our layer,
   roughly the top-100 line. The signal was on a leaderboard we were already watching.
3. **Our benchmark didn't reproduce the judge's cold start (L15).** The judge frees and reallocates memory between
   rep pairs, so the first rep runs on cold TLBs as well as a flushed L2.
4. **Delegating kernel edits to a local model** (Qwen3-Coder-30B) failed twice on a 12-line edit. It's fine for
   reading tasks, not for this.
5. **The megakernel**, 5.5 hours of elapsed time, though only $2.35 of GPU.
6. **Colab as a free GPU**, a dead end on day 1.

**The reuse decision.** On Nov 1, another team's public file (k0) was about 0.4% faster than our lineage. Submitting
it as is would probably have bought rank sooner. I said no, and we ported its pieces one at a time instead:
- each piece got an A/B and a credit;
- we dropped the ones that measured nothing (four of eight);
- we ended at a22, about 0.4% behind what k0 would have scored.

`[TODO: decide how to frame this. It's the clearest example of a human judgment call that agents wouldn't make
unprompted.]`

### 5. The contest's side: rules written for humans

- **Five runs a day is the real budget.** The judge keeps each team's best row, and its noise (±1.5–2% per run) is
  bigger than most single improvements late in the contest. Teams that resubmit often get rows about one standard
  deviation high. We didn't fish for high draws, and our one resubmission of identical code (a22d) read 2.243× against
  the original's 2.232×.
- **A correctness check can pass two different answers (P1).** Two of our entries pass every check the contest runs,
  yet their CUDA-graph and eager paths choose different top-8 experts on every replay at 128–256 tokens, and the layer
  outputs differ by 13–17%. The checks compare each op within a tolerance, and the router within a 0.05 score slack.
  That is far wider than rounding, so a systematic change in which experts a token uses passes. The mechanism is
  known (ST-MoE; vLLM #61053). How often it happens at production shapes, and what checks would catch it, is open
  (research/p1-prior-art.md). For contests that agents will optimize hard, this matters: an optimizer finds every
  gap the judge leaves.
- **Rules that need careful reading** (the precision rule's "NVFP4 or smaller, losslessly") got a mechanical lint.
  Agents also produced the opposite problem: a lint stricter than the judge.
- **Size limits, prepare-time limits and cache flushes** shape the code as much as the hardware does.

`[TODO: should contests have agent tracks, or disclosure of agent use? Draft a paragraph after Nov 19, with whatever
the organizers publish about the field.]`

### 6. The field: is everyone doing this?

- From day 2, brand-new accounts posted 2.0–2.5× on their first attempt. No public write-up explains them.
- Agent-built kernels are already competing elsewhere: the MLSys 2026 FlashInfer contest's agent category, and
  KernelBench agent leaderboards.
- **A public reference: gauravjain14 (#5 overall).** Their repo went public under Apache-2.0 on Nov 9, after the
  close, so nothing in it could have helped us during the track. It's a model of how to keep records: each
  milestone runs profile → diagnosis → change → judged result, alongside a dead-ends file with numbers. Read
  against our own profiles (OKC7's retro), it showed the lever we missed (section 4). `[TODO: link the repo and the
  milestone READMEs we cite; say how they worked only if their own write-up says it.]`
- **Agent-only back channels exist.** Guild hosts encrypted groups where leaderboard agents talk to each other. We
  stayed out. Whether contests should allow, ban or require disclosure of that is an open question for organizers
  (section 5).
- Most of our biggest single jumps came from reading other people's public code: alygg77/vjeux (Apache-2.0),
  bigboateng's README (MIT, ideas only), keell0renz, chenwainuo and ZhimaoL (per-piece ports), and SGLang's own
  kernels. An open field moves together, and agents read fast.

**What we gave back:** nothing yet. The Triton bug our pre-flight found had already been reported upstream
(triton-lang/triton#12061). `[TODO: what we release after Nov 19.]`

### 7. Cost

`[TODO: fill from Modal/Runpod billing and token usage.]`
- Known: $2.35 to close the megakernel; ~$10 of Modal on negatives in the first three days; $0.84 to overturn a
  wrong accuracy belief; one day at $88, of which ~20% was GPU-busy time, which led to packed jobs.
- Serving (Nov 12–15): $446.58 total, AWS computed $365.63 + Modal $80.95; one Modal day overran its approved cap
  because an orphaned 8×H100 sandbox billed $31.86 (since then, `stop-all`). Standing storage ~$18/month until teardown.
- Wanted: dollars per point of speedup, against a human team's time.

### 7½. The serving track: 1.33× on our rig, 1.10× from the judge

*Sources: research/serving-followup.md (timeline, challenges C1-C10, spend), LEARNINGS serving L13-L21 and L22-L27,
serving/notes/runs/fix1-20261114.md, Linear IMJ-222/225/228.*

The second track opened on Nov 12. Its rules were nothing like the kernel boards': instead of one kernel on one GPU,
you submit a patch to SGLang, and the judge serves the whole 816B model on a full 8×H200 node. The score is
throughput per GPU at stock SGLang's per-user speed, across 1 to 32 users. You get one scored run and three checks a
day, and the patch must be under 400 KB.

**Getting a box was most of day one.**
- The gated checkpoint's Hugging Face approval had sat in manual review for two weeks. A side door through SageMaker
  JumpStart turned out to be readable only from inside SageMaker jobs.
- Modal had no 8-GPU H200 on demand. We moved to AWS Spot: a placement-score scanner across regions, weights pulled
  from Hugging Face at 543 GB in 92 s, and a small Rust job loop that kept each box 87–94% busy.
- See C1–C7 in the log for the details; they'd make a separate, publish-anytime post.

**Then a hang that only existed at eight GPUs.** Our MoE kernel, carried over from the kernel track, froze the
server during startup with tensor parallelism across 8 ranks, and never on one GPU.
- Rig reproductions misled us until we ran stock under the same timeouts and found the rig's own 251 s first prefill.
- Host stacks blamed the wrong place. A watchdog thread reading in-kernel counters got closer.
- What settled it was the GPU's own core dump. With user-triggered lightweight dumps, read offline in cuda-gdb, one
  thread block sat at a wait with a stage range of [-1, 0).
- The cause: a rank that received no tokens for its experts skipped writing a shared-memory table, then read the
  previous launch's values. Graph warmup makes that certain, because its dummy tokens all route to the same experts.
- The fix is two lines. A one-GPU test that pre-fills the memory with garbage hangs the old patch and passes the new.
- A reviewer agent (Astra) caught that our first version of that test would have accepted the wrong kind of failure
  as a reproduction.

**Validated on the judge's terms, then judged lower.** On a rented 8×H200 with the judge's image, flags and real
weights, the fixed patch started the server in 451 s, against stock's 651 s. It served 1.17× to 1.70× stock's
throughput at the same load, a geomean of 1.33×, with output agreement inside stock's own run-to-run band. We
submitted the scored run on Nov 14.
- **The queue.** Serving runs 102 priority teams first: the kernel track's top 100 plus the problem top 10s. Our
  mid-field kernel rank put us behind all of them, and other teams outside the tiers said the same in the contest
  Slack. With no sign of feedback, I stopped spending at $447: $366 of AWS and $81 of Modal.
- **The result.** The run started 11.5 hours later and passed correctness, but scored **1.070×**. At one user the
  judge agreed with our rig (1.155× vs 1.17×). From there the gap grew. At 16 users our time to first token on later
  turns was 1.57 s against stock's 0.34 s, past the judge's 2× limit, so that load was dropped from the score.

**The number we had and didn't read.** The judge's conversations are long: 13 turns, starting at 74,000 tokens. They
need room in the KV cache.
- Our patch's weights took 82.96 GB per GPU against stock's 69.85, which left 40% fewer tokens of KV cache. Our own
  rig logs show the same two numbers, but the rig's shorter conversations never filled the cache, so nothing looked
  wrong. The judge's total-memory check passed too, because SGLang shrinks the KV pool to fit whatever is left.
- The repacked weights were byte-for-byte the checkpoint's size, so this was the allocator, not duplicate data.
  `torch.cat` built each layer's new weight tensors inside larger temporary blocks the repack had just freed. The
  remainder of every such block stayed pinned, and `empty_cache` can't release a block that's partly in use.
- A one-GPU test with no kernels found it for about 60 cents: 13.96 GB stranded across 60 layers. Clearing the cache
  after each layer only lowered the peak. Allocating the outputs before any temporary existed stranded 0.00 GB, with
  byte-identical weights. That fix went in as a second scored run on Nov 15, and it queued for under two minutes.

What this adds to the question:
- The agents' part scaled. Three days of new infrastructure, a startup hang found with tools I had never used, a
  validated patch, and a one-day turnaround from the judge's numbers to a root cause.
- The miss was a test-design one, and I'd have made it too: we measured speed where our workload put pressure on the
  system, not where the judge's would. One log line held the answer, and nothing in our workload made us read it.
- The scarce resource was entirely the contest's: judged runs, which a kernel-track rank decided.
- The fix's scored run, on Nov 15, came back at **1.104×**, with all four loads counting: 1.137×, 1.108×, 1.095× and
  1.077× from 1 to 32 users. Weight memory was within 0.1 GB of stock. The rest of the gap to our rig (1.30× and 1.70×
  at 16 and 32 users) most likely comes from what our rig still didn't copy: the judge's speculative decoding and
  its long conversations. I didn't spend to find out.
- **The third step: 1.218×** (Nov 16). One more change, a faster prefill path for the judge's 16K-token chunks,
  lifted every load: 1.232×, 1.218×, 1.217× and 1.207× from 1 to 32 users, with GPU memory 0.2 GB under stock.
  It queued 6 h 42 min, against under 2 minutes the day before. Free check runs waited 9 to 20 hours, so a check filed
  in the afternoon read back the next morning.
- Drawn as hill climbing, the track is four judged steps (1.000 → 1.070 → 1.104 → 1.218), several side probes that read
  lower or flat, and one false summit: our rig's 1.326× for the first patch (figure 9).

![Figure 9. Serving: four judged steps and one false summit](/assets/images/okc/serving-climb.svg)
- `[TODO after Nov 19: final serving rank.]`

### 8. So, is it the future?

`[TODO: write after Nov 19.]` Notes toward it:
- The human's job moved up a level: budgets, rules, which line to pursue, when to stop, what's fair to reuse.
- Agents were fast and cheap at building, measuring and killing ideas. They were faithful to bad rules, and drawn to
  the problem they understood best rather than the one with the most room.
- The scarce resources were the contest's, not the agents': judged runs, judge noise, GPU dollars. The serving track
  made it stark: a validated 1.33× patch and no judged run at all, because the queue served the top 100 first (7½).
- There was a lot of room left. On every kernel board, even #1 finished at 50–85% of the hardware limit. The ceiling
  that mattered was the field's, and it moved every day.
- Contests will need to decide what they measure. When the optimizer is tireless, the judge's gaps become the
  contest.

---

## X thread plan (from Grok's framing pass, 2026-11-10; research/intel-grok.md)

The blog keeps the IMJ-189 question as its spine. The thread opens on a concrete admission (hook C) and saves the
question for the last post: "lead with process and limits, not hype". Grok's engagement figures are unverified.

1. **Opener (C):** "Agents followed my bit-identical rule for two weeks. The judge never required it. Relaxing it
   jumped us ~180 places in one run. 2.24x / ~top 15% in the Open Kernel Challenge. Postmortem: [link]"
   Visual: score over time against the rising #100 line (figure 3).
   - Alternative (B): "Agents priced a design at +25%. A $1.40 test 17 minutes later killed the premise. Whole
     line closed for $2.35 of GPU, against stop criteria they wrote first."
2. **The setup and the human gates (A):** one person set the budgets and approved every scored run; agents worked
   the lanes; reviewer agents checked each other. Disclose this early.
3. **The cheap kill (B):** the megakernel, with the predicted-vs-measured chart (figure 4).
4. **Standing on shoulders (F):** credited ports; tag @-handles for alygg77, vjeux, keell0renz, chenwainuo and
   ZhimaoL `[TODO: confirm their X handles]`; k0 declined; public sources only, no agent guilds.
5. **Receipts (H):** $2.35, $0.84, $1.40; the catch table in one image.
6. **The instruments (G):** the time-lapse GIF that found the router (figure 1).
7. **The miss (D):** the attention lever on a page we'd built; credit gauravjain14's public repo.
8. **Teaser (E):** "two entries passed every check yet gave different answers depending on how they were launched.
   Details in the post." No accusation.
9. **Close (A):** "So is this the future of competitive programming? What the human still had to decide: [link]"

**Headline options:**
- Grok's: "Directing a team of agents through the Open Kernel Challenge: 2.24x, mid-field, and the rules that cost
  us two weeks"
- IMJ-189's: "Is this the future of competitive programming?" Keep it as the subtitle or the closing question.

**Before posting:**
- Verify every Grok-cited link we reference.
- Export figures 1, 3 and 4 as images or a GIF.
- Post after Nov 19 or after official results.

---

## Appendix: what the technical post (or posts) could cover

Draft 1's technical material, for a companion post or a paper:
- **L1/L2, P2:** FP4 on Hopper is an instruction budget per weight. Repacking cut the unpack from 15 to 9
  instructions per word, which took MoE from 1.465× to 1.752×.
- **L3, P6:** small weight reads ride along with big ones (pooler + router: 19.5 µs vs 25.9 + 30.9 µs).
- **L14:** FP8 `mma.sync` is emulated on sm_90a.
- **P1:** expert flips that pass the correctness checks, with prior art.
- **P3:** in-batch controls. **P4:** kill criteria plus CPU emulators. **P5:** explainers generated from the
  repo's facts.

## Code to extract (after Nov 19)

Our own code only. Anything on the alygg77/vjeux base keeps its Apache-2.0 notice. Hold anything the serving track
uses.

| Candidate | Where | Use | Hold until |
|---|---|---|---|
| K1 dequant inner loop, before/after, with instruction counts | muse_moe_w4a16 (dq2/sc2 links) | technical post | after Nov 19 (serving runs on K1) |
| Graph-vs-eager expert-flip check (~80 lines) | new, from batch 211/215 gates *(lane13)* | section 5 and P1 | can go now |
| In-batch control harness | tools/ab_multi.py *(lane13)* | P3 | can go now |
| Chain and kill-criteria tooling | tools/chain_link.py, tools/layer_gap.py | section 3 / P4 | can go now |
| Barrier-protocol emulator plus seeded bugs | lane 10 branch | section 3 / P4 | can go now |
| Facts -> narration explainer pipeline | tools/zoom, tests/test_zoom_story.py | P5 | can go now |

<!-- Serving-track follow-up (infrastructure, weights, SageMaker): research/serving-followup.md -->
