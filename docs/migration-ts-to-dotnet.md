# Migration guide: TypeScript (NestJS) -> C# (.NET / ASP.NET Core)

This document lists idiomatic mappings and a checklist to migrate services from NestJS (TypeScript) to ASP.NET Core (C#).

Key mappings
- Controllers -> Controllers (annotated with [ApiController], [Route])
- Services -> Scoped services registered in DI (builder.Services.AddScoped<...>)
- DTOs -> Plain C# classes or record types; use FluentValidation or DataAnnotations for validation
- Guards/Strategy -> Authorization policies and middleware (JwtBearer) or custom middleware
- Mongoose models -> MongoDB C# POCOs with Bson attributes (or EF Core entity models for relational DB)
- Pipes (validation/transform) -> Model binding + FluentValidation / manual validation
- Exception filters -> Use try/catch and ProblemDetails middleware or ExceptionFilterAttribute

Checklist
- [ ] Scaffold minimal .NET Web API project
- [ ] Implement models & DTOs
- [ ] Implement services (auth logic, user persistence)
- [ ] Implement JWT and refresh token logic (consider DynamoDB or Redis for refresh tokens)
- [ ] Create Dockerfile and CI pipeline (Jenkinsfile template added)
- [ ] Add health endpoints and readiness/liveness probes
- [ ] Add logging (structured), metrics and tracing
- [ ] Run integration tests and compare outputs to old system

Notes
- We scaffolded a minimal auth service at `apps/dotnet/auth` to demonstrate the approach.
- Decide whether to keep MongoDB (we used the Mongo C# driver) or migrate to Postgres + EF Core.
