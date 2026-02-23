# AI Chat Integration for Seed Users

This module integrates AI-powered chat responses for seed users in the application.

## Overview

The `AIChatManager` class automatically monitors chat conversations involving seed users (user IDs 1000-9999) and generates appropriate AI responses based on their personality traits and interests.

## Features

- **Automatic Message Detection**: Monitors all chats for unread messages to seed users
- **Personality-Based Responses**: Uses each seed user's personality traits and interests to craft responses
- **Interest Matching**: Determines if conversation topics relate to the user's interests
- **Adaptive Timing**: Adjusts checking frequency based on activity:
  - 1.5 minutes when active (new messages found)
  - 3 minutes when idle (no new messages)
  - 6 minutes when inactive (extended period without messages)
- **Character Limits**: Ensures responses are between 10-550 characters (preferably shorter)
- **Fallback Responses**: Handles OpenAI API connection issues gracefully
- **Real-time Notifications**: Attempts to notify the main server for immediate notification badges
- **Unread Message Management**: Properly marks AI responses as unread for recipients

## How It Works

1. **Periodic Checking**: The system checks for new messages at regular intervals
2. **Message Analysis**: When unread messages are found, it retrieves the last 20 messages from the conversation
3. **Personality Loading**: Loads the seed user's personality data from their profile file
4. **Interest Matching**: Determines if the conversation relates to the user's interests
5. **AI Response Generation**: Uses OpenAI GPT-4.1 nano (same as seedpost mechanics) to generate an appropriate response based on:
   - User's personality traits
   - User's interests
   - Conversation context
   - Whether the topic is relevant to their interests
6. **Response Sending**: Sends the generated response, marks previous messages as read, and attempts to notify the main server for immediate notification updates

## Response Types

### Engaged Responses
When the conversation relates to the user's interests:
- Shows knowledge and enthusiasm
- Provides meaningful engagement
- Reflects personality traits

### Dismissive Responses
When the conversation is outside the user's interests:
- "sorry but i dont really understand these things"
- "not really my thing"
- "i dont know much about that"

### Fallback Responses
When there are connection issues:
- "i'm kinda busy, i'll talk to you later"

## Configuration

The system uses the following environment variables:
- `OPENAI_API_KEY`: OpenAI API key for generating responses
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Database connection settings
- `MAIN_SERVER_URL`: URL of the main server for notification broadcasting (default: http://localhost:3000)

## Files

- `aiChatManager.js`: Main AI chat management class
- `testAIChat.js`: Test script to verify functionality
- Personality files: `seedusers/{username}/{username}_personality.js`

## Integration

The AI Chat Manager is automatically initialized when the seedservice starts and runs continuously in the background.

## Logging

The system provides detailed logging with the `[AI Chat]` prefix for monitoring and debugging purposes.