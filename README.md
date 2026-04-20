# ComsOS

ComsOS is a personal AI academic companion that learns alongside you, keeping track of every subject, note, and concept so you never have to. Just tell it your goals and exam dates, and it reverse-engineers your entire study plan — breaking down every topic, scheduling exactly what to review and when, and adjusting automatically as you progress. Unlike other study tools, StudyOS understands how your subjects connect, spotting that your struggles in Physics might trace back to gaps in Calculus before you ever realize it. It doesn't just react to your questions either — it proactively checks in, reminds you to study, and notices when your performance is slipping so it can suggest a break before burnout sets in. Everything you need is in one place: notes, flashcards, assignments, and a smart daily plan, all threaded together by an AI that's less like a chatbot and more like a chief of staff for your academic life.

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
