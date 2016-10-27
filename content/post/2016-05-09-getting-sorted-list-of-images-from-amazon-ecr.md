---
date: 2016-05-09T00:00:00Z
description: ""
tags:
- golang
- aws
- ecr
- docker
title: Getting sorted list of images from Amazon ECR
url: /2016/05/09/getting-sorted-list-of-images-from-amazon-ecr/
---

{% include JB/setup %}

I recently switched from using own hosted Docker Registry to the amazon hosted [Elastic Container Registry](https://aws.amazon.com/ecr/) and found that the UI, well, sucks. The results aren't returned in any kind of sorted order and the UI doesn't help you do that. In addition, it's the same issue with the cli tool. I wish they included a timestamp field to know when the layer/image was created but in absence of that, the image tag are the best we have to go with.

```
package aws

import (
	"fmt"
	"sort"
	"strings"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ecr"
)

type SortImageIds []*ecr.ImageIdentifier

func (c SortImageIds) Len() int      { return len(c) }
func (c SortImageIds) Swap(i, j int) { c[i], c[j] = c[j], c[i] }
func (c SortImageIds) Less(i, j int) bool {

	//fmt.Println(*c[i].ImageTag, *c[j].ImageTag)
	if c[i].ImageTag == nil {
		return true
	}
	if c[j].ImageTag == nil {
		return false
	}
	return strings.Compare(*c[i].ImageTag, *c[j].ImageTag) == -1
}

func GetSortedImageIds(region string, registryId string, repositoryName string) []*ecr.ImageIdentifier {

	ecrSvc := ecr.New(session.New(), &aws.Config{Region: aws.String(region)})

	done := false
	var imageIds []*ecr.ImageIdentifier
	params := &ecr.ListImagesInput{
		RepositoryName: aws.String(repositoryName),
		MaxResults:     aws.Int64(100),
		RegistryId:     aws.String(registryId),
	}
	for !done {
		resp, err := ecrSvc.ListImages(params)

		if err != nil {
			// Print the error, cast err to awserr.Error to get the Code and
			// Message from an error.
			fmt.Println(err.Error())
			return nil
		}

		//fmt.Println(resp)
		for _, imageID := range resp.ImageIds {
			imageIds = append(imageIds, imageID)
		}
		if resp.NextToken == nil {
			done = true
		} else {
			params.NextToken = resp.NextToken
		}
	}
	sort.Sort(SortImageIds(imageIds))

	return imageIds

}
```

This is a very simple implementation -- some details have been removed. You're expected to have your AWS environment variables already setup. If the CLI tool is working for you, you should be fine.


Now you can call this function using

```
imageIds := awsapi.GetSortedImageIds("us-east-1", "<account Id>", "<repo name>")
fmt.Println(imageIds)
```

and get a lexically sorted list by ImageTag.
