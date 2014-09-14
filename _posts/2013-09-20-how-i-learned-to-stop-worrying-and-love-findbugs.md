---
layout: post
title: "How I learned to stop worrying and love Findbugs"
description: ""
category:  
tags: ["java", "findbugs"]
---
{% include JB/setup %}

*Update:* I know this is about a year late. I should do `git stash pop` more often.

## The Five Stages of Grief

Here is a cycle I see repeating in programmers (including myself) whenever a static analyzer is introduced in build process too late in the game. 

* Denial:
  - Before running anything "My code is awesome, the static analyzer will not catch anything for sure." And after running -- it should be a minor fix to resolving any issues

* Anger: 
  - How could my code be so bad. I totally did skim all the best practices of "Java Concurrency Patterns" and "Effective Java"

* Bargaining:
  - You always lose in bargaining with a compiler. Just face it.

* Depression
  - Damn, I should have picked a different profession

* Acceptance
  - Okay, I will fix all these issues and automate the process


## Post-Acceptance

Many times, I have had to turn off findbugs or add many exceptions to avoid introspecting into libraries I may not have control over. This leads to brittle software regardless of how awesome your coding and debugging skills are. I once had to include some WebSphereMQ libraries that were and are still dark-arts to me how they function. I had to ensure nothing in the namespace could ever be looked at. But the problem is -- now, a core component of your application is ignored by your safety checks. I think the only way to ensure performance and safety is to ensure across the organization that minimum safety checks are done for everything used. It is easier said than done in big slow moving enterprises. Here is my `findbugs-ignore.xml` that I copy-paste in any new projects. See if you spot any issues. 

```
    <FindBugsFilter>
      <Match>
        <Class name="~.*Test$"/>
      </Match>
      <Match>
        <Package name="~test\..*"/>
      </Match>
      <Match>
        <Package name="awesome.package"/>
      </Match>
    </FindBugsFilter>
```

I ignore tests, mostly because I give myself freedom to cheat in those. You should avoid obvious problems but if being able to abuse reflection in test makes your tests better understandable, go ahead and do it. The last match is a generated package that has history of its own. I ran into enough problems trying to get it close enough to get findbugs to pass properly that I have started to ignore them by default and add enough sane items in the code generation step to ensure rest of the system does not fall apart.

On that Note. If you have to parse some XMLs and you are given some XSDs with questionable timestamps, this could be handy.


```
                <plugin>
                    <groupId>org.jvnet.jaxb2.maven2</groupId>
                    <artifactId>maven-jaxb2-plugin</artifactId>
                    <version>0.8.3</version>
                    <configuration>
                        <schemaDirectory>${basedir}/src/main/resources/schema</schemaDirectory>
                        <bindingDirectory>${basedir}/src/main/resources/schema</bindingDirectory>
                        <strict>false</strict>
                        <extension>true</extension>
                        <generatePackage>awesome.package</generatePackage>
                        <plugins>
                            <plugin>
                                <groupId>org.jvnet.jaxb2_commons</groupId>
                                <artifactId>jaxb2-basics</artifactId>
                                <version>0.6.2</version>
                            </plugin>
                            <plugin>
                                <groupId>org.jvnet.jaxb2_commons</groupId>
                                <artifactId>jaxb2-basics-annotate</artifactId>
                                <version>0.6.2</version>
                            </plugin>
                        </plugins>
    
                        <args>
                            <!-- JAXB/Jackson annotations to make xml/json serialization easier -->
                            <arg>-Xannotate</arg>
                            <!-- For debugging -->
                            <arg>-XtoString</arg>
                            <!-- Value based equality and hashcode methods -->
                            <arg>-Xequals</arg>
                            <arg>-XhashCode</arg>
                            <arg>-Xmergeable</arg>
                            <arg>-Xcopyable</arg>
                        </args>
                    </configuration>
                  </plugin>
```

I have gotten bitten by terrible ISO8601 standards, so anything timestamp, I convert them to JODA DateTime formats immediately via a `bindings.xjb` file. This might be worth another post. I'm including the `bindings.xjb` file here anyway for reference.



```
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <jaxb:bindings xmlns:jaxb="http://java.sun.com/xml/ns/jaxb"
                     xmlns:xs="http://www.w3.org/2001/XMLSchema"
                     xmlns:xjc="http://java.sun.com/xml/ns/jaxb/xjc"
                     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                     xmlns:annox="http://annox.dev.java.net"
                     xsi:schemaLocation="http://java.sun.com/xml/ns/jaxb http://java.sun.com/xml/ns/jaxb/bindingschema_2_0.xsd"
                     version="2.1">
      
          <jaxb:globalBindings>
              <!-- Use java.util.Calendar instead of javax.xml.datatype.XMLGregorianCalendar for xs:dateTime
                for obvious sanity-saving reasons -->
              <xjc:javaType  adapter="awesome.package.beans.adapter.DateXmlAdapter" name="org.joda.time.DateTime" xmlType="xs:date" />
              <xjc:javaType  adapter="awesome.package.beans.adapter.DateXmlAdapter" name="org.joda.time.DateTime" xmlType="xs:dateTime" />
      
              <!-- Force all classes implements Serializable -->
              <xjc:serializable uid="1"/>
          </jaxb:globalBindings>
      
      
      
      
      </jaxb:bindings>
```

Ok, now that I have referenced a "Bean" I have to include that too.. Do not copy this.. this was very specific to what I was doing. I got a date source with no timestamp that I had reasonable guarantee that it would orginate from Eastern time. I hope you don't have to do such hacks. But if you need to, this will be handy.

```java
    /**
     * Converts a date <code>String</code> to a <code>Date</code>
     * and back.
     *
     * @author David Winterfeldt
     */
    public class DateXmlAdapter extends XmlAdapter<String, DateTime> {
    
      public static final DateTimeFormatter NO_TIMEZONE_TIME_FORMAT = DateTimeFormat.forPattern("yyyy-MM-dd'T'HH:mm:ss").withZone(DateTimeZone.forID("America/New_York"));
    
      private static final DateTimeFormatter CHECKING_FORMAT =
            ISODateTimeFormat.dateTime();
    
        @Override
        public DateTime unmarshal(String value) {
    
          return NO_TIMEZONE_TIME_FORMAT.parseDateTime(value);
        }
    
        @Override
        public String marshal(DateTime value) {
          return CHECKING_FORMAT.print(value);
        }
    
    }
```

Ok, back to findbugs.. Being able to use findbugs to keep sanity despite all thes pitfalls makes it an excellent tool. Additionally, I have found that any bad coding practices get caught immediately by the CI server anyway.

Some notes a year later: 

1) I'm lazy with blogging and keep meaning to fix it

2) Findbugs continues to pay off for Java projects. Partially because I tend to jump around languages not-infrequently for whatever reason. And when I dive back into it either after someone else has written some more code, findbugs ensures that the code is in reasonable shap.

3) There's no order to my thoughts there.. but I'm posting anyway. Feel free to complain.
