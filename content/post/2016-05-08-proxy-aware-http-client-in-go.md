---
date: 2016-05-08T00:00:00Z
description: ""
tags: []
title: Proxy Aware Http Client in Go
url: /2016/05/08/proxy-aware-http-client-in-go/
---



I keep running into situations where I find myself at a cafe or something where I'd rather not send all my traffic through work VPN. So alternatively, I use a SOCKS5 proxy for that. That works well for browsing, etc but what about applications I'm developing as well. Thankfully Go has a library that makes proxy aware http Clients really easy to write.

It's not executable, but I uploaded my example on Go Playground. https://play.golang.org/p/NWfG9b5GIN

``` go
package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"

	"golang.org/x/net/proxy"
)

func ProxyAwareHttpClient() *http.Client {
	// sane default
	var dialer proxy.Dialer
	// eh, I want the type to be proxy.Dialer but assigning proxy.Direct makes the type proxy.direct
	dialer = proxy.Direct
	proxyServer, isSet := os.LookupEnv("HTTP_PROXY")
	if isSet {
		proxyUrl, err := url.Parse(proxyServer)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Invalid proxy url %q\n", proxyUrl)
		}
		dialer, err = proxy.FromURL(proxyUrl, proxy.Direct)
	}

	// setup a http client
	httpTransport := &http.Transport{}
	httpClient := &http.Client{Transport: httpTransport}
	httpTransport.Dial = dialer.Dial
	return httpClient
}

func main() {
	req, err := http.NewRequest("GET", "http://google.com", nil)
	if err != nil {
		panic(err)
	}

	client := ProxyAwareHttpClient()
	res, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	contents, err := ioutil.ReadAll(res.Body)
	if err != nil {
		panic(err)
	}
	fmt.Println(string(contents))
}
```

Try this:

First just run `go run main.go` which should query Google.com and get you the output.

Then open a socks proxy to your favorite server using `ssh -D 8081 <server>`

```
HTTP_PROXY=socks5://localhost:8081 go run main.go
```


The nice thing here is that this solution works for other types of proxies too. I have tried http and https. I do understand the convention is to use the lowercase `http_proxy` which is fairly easy to change too.
