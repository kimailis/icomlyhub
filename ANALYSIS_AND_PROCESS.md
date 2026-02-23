# IcomlyHub Analysis and Process

## Project Overview
IcomlyHub is a merger of two projects:
1. **JuicyHub**: A celebrity gossip intelligence platform featuring automated tracking, AI-generated summaries, and a modern design.
2. **Icomly**: A social platform featuring user profiles, posts, likes, comments, and a seed service for simulated social activity.

The goal is to create a unified platform called **Icomly** that uses JuicyHub's design and core functionality but integrates Icomly's social features and resources.

## Migration Process

### 1. Initialization
- Created `/root/icomlyhub` directory.
- Initialized a new Git repository.
- Copied `juicyhub` codebase as the foundation.
- Replaced all occurrences of "JuicyHub" with "Icomly" across the codebase.

### 2. Schema Integration
- Expanded the Prisma schema to include Icomly's social features:
    - **User Profiles**: Added `bio` and `profilePath` to the `User` model.
    - **User Follows**: Added `UserFollow` model for peer-to-peer follows.
    - **Posts**: Added `Post` model for user-generated content on user profiles or celebrity profiles.
    - **Comments**: Added `Comment` model to support comments on `Post`, `Article` (Feed Items), and `Sighting`.
    - **Likes**: Added `Like` model to support upvoting/downvoting on `Post`, `Comment`, `Article`, and `Sighting`.
- Updated existing `Celebrity`, `Article`, and `Sighting` models to relate with the new social models.

### 3. Feature Integration (Planned)
- **Social UI**: Port components from Icomly's React client to IcomlyHub's Next.js frontend.
- **API Endpoints**: Implement new Next.js API routes for social interactions (posting, liking, commenting).
- **Seed Service**: Integrate Icomly's `seedservice` to populate the new platform with activity.
- **Authentication**: Ensure Google Auth and standard login/signup are fully integrated.
- **Verification**: User-created feed items will be sent to a verification pipeline (AI-based) before being posted publicly.

### 4. Resource Configuration
- **OpenAI**: Use Icomly's API keys for content generation and verification.
- **Mail Server**: Use Icomly's SMTP configuration.
- **Google Auth**: Use Icomly's OAuth credentials.

## Technical Notes
- The database has been switched from MySQL (Icomly) to PostgreSQL (JuicyHub foundation) using Prisma.
- Relationships have been normalized into tables instead of using JSON strings where appropriate for better performance and integrity in PostgreSQL.
- **Seed Service Integration**: 
    - A new `seed-social.ts` worker will be created in the `worker` service.
    - This worker will handle:
        - Seeding the `User` table with established seed users (IDs 1000-9999).
        - Periodic generation of `Post`, `Comment`, and `Like` activity.
        - Integration with OpenAI for high-quality, personality-driven content.
        - Automated following between seed users to simulate a growing social network.
    - Profile pictures for seed users will be managed and served via the webapp's public directory or a dedicated storage service.
