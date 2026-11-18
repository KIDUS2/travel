package com.teguwaz;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class TeguwazApplication {

    public static void main(String[] args) {
        SpringApplication.run(TeguwazApplication.class, args);
    }
}
