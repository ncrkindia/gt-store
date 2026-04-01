$services = @("api-gateway", "user-service", "product-service", "cart-service", "order-service", "inventory-service", "payment-service", "notification-service")

$deps = @"
		<dependency>
			<groupId>io.micrometer</groupId>
			<artifactId>micrometer-registry-prometheus</artifactId>
		</dependency>
		<dependency>
			<groupId>io.micrometer</groupId>
			<artifactId>micrometer-tracing-bridge-brave</artifactId>
		</dependency>
		<dependency>
			<groupId>io.zipkin.reporter2</groupId>
			<artifactId>zipkin-reporter-brave</artifactId>
		</dependency>
"@

$actuator = @"
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-actuator</artifactId>
		</dependency>
"@

foreach ($svc in $services) {
    $pom = "$svc\pom.xml"
    if (Test-Path $pom) {
        $content = Get-Content $pom -Raw
        
        $insertDeps = $deps
        if ($content -notmatch "spring-boot-starter-actuator") {
            $insertDeps = $actuator + "`n" + $deps
        }
        
        if ($content -notmatch "micrometer-registry-prometheus") {
            $content = $content -replace "(?s)(.*)</dependencies>", "`$1$insertDeps`n`t</dependencies>"
            Set-Content $pom $content -NoNewline
            Write-Host "Updated pom.xml for $svc"
        }
    }
}

$yml = @"

management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  metrics:
    tags:
      application: `$`{spring.application.name}
  tracing:
    sampling:
      probability: 1.0
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
"@

foreach ($svc in $services) {
    $appYaml = "$svc\src\main\resources\application.yml"
    if (Test-Path $appYaml) {
        $content = Get-Content $appYaml -Raw
        if ($content -notmatch "prometheus") {
            Add-Content $appYaml $yml
            Write-Host "Updated application.yml for $svc"
        }
    }
}
