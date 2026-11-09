
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

# Restore dependencies separately for Docker caching
COPY *.csproj ./
RUN dotnet restore

# Copy source code and publish
COPY . .
RUN dotnet publish -c Release --no-restore -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

USER $APP_UID

ENTRYPOINT ["dotnet", "SchoolAdmission.Api.dll"]
