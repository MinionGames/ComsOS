# ComsOS

ComsOS is a personal AI academic companion that learns alongside you, keeping track of every subject, note, and concept so you never have to. Just tell it your goals and exam dates, and it reverse-engineers your entire study plan — breaking down every topic, scheduling exactly what to review and when, and adjusting automatically as you progress. Unlike other study tools, ComsOS understands how your subjects connect, spotting that your struggles in Physics might trace back to gaps in Calculus before you ever realize it. It doesn't just react to your questions either — it proactively checks in, reminds you to study, and notices when your performance is slipping so it can suggest a break before burnout sets in. Everything you need is in one place: notes, flashcards, assignments, and a smart daily plan, all threaded together by an AI that's less like a chatbot and more like a chief of staff for your academic life.

## Core Features
- Spaced Repetition algorithm incorporating 3PL, IRT, and Ebbinghaus Forgetting Curve (under development)
- Task management system with structured organization of assignments and study goals
- Notes system for storing and retrieving academic content
- AI-assisted tools for enhancing study efficiency
- Modular architecture designed for future feature expansion

## System Design
- Structured data management for user content
- Separation of core modules (tasks, notes, AI tools)
- Scalable architecture for future feature integration
- Version-controlled development using Git

## Tech Stack
- Python
- Typescript
- HTML
- Supabase
- React
- Anthropic

## Reference Research Papers
- [Modeling Spaced Repetition with LSTMs](https://www.supermemo.com/wp-content/uploads/SuperMemo_AI.pdf)
- [The Impact of Spaced Repetition Learning on the Learning Success in Mobile Learning Games](https://www.researchgate.net/publication/357726507_The_Impact_of_Spaced_Repetition_Learning_on_the_Learning_Success_in_Mobile_Learning_Games)
- [Eliciting Self-Explanations Improves Understanding](https://andymatuschak.org/files/papers/Chi%20et%20al%20-%201994%20-%20Eliciting%20self-explanations%20improves%20understanding.pdf)

## Developers-Only
### Development Tools Necessary
#### For the frontend (Next.js app):
- next (v16.2.4)
- react (v19.2.5)
- react-dom (v19.2.5)
- @types/node (dev)
- @types/react (dev)
- typescript (dev)

#### For the root (shared or backend logic):
- @supabase/supabase-js (v2.103.3)
- @types/next-auth (v3.13.0)
- next (v13.4.0)
- next-auth (v4.24.14)
- react (v18.2.0)
- react-dom (v18.2.0)

#### To install:
- For frontend: Run npm install in the frontend directory.
- For root: Run npm install in the root directory.
- For backend: Add required Python packages to requirements.txt and run pip install -r requirements.txt.
