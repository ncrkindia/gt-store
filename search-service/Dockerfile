# Build Stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# Note: mvn clean package will handle dependency downloading with reliable caching in Docker
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime Stage
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 4011
ENTRYPOINT ["java", "-jar", "app.jar"]
