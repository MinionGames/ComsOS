# Product Requirements Document (PRD)

## Product Name

ComsOS SAT

## Vision

ComsOS SAT is an AI-powered learning intelligence platform that models student knowledge as a network of interconnected concepts. Instead of simply tracking right and wrong answers, ComsOS identifies underlying weaknesses, prerequisite gaps, and high-impact study opportunities to maximize score improvement.

The system acts as a personalized academic analyst rather than a question bank or flashcard application.

---

# Problem Statement

Current SAT platforms tell students:

* What questions they missed
* What topics they struggle with

They do not explain:

* Why those mistakes occur
* Which prerequisite concepts are responsible
* Which weaknesses have the highest score impact

Students often waste time practicing symptoms rather than root causes.

---

# Target User

Primary User:

High school students preparing for the SAT.

Characteristics:

* Score range: 1200–1550
* Motivated by measurable improvement
* Taking practice tests regularly
* Looking for personalized guidance

---

# Core Value Proposition

Upload practice test results.

ComsOS will:

1. Build a personalized knowledge model.
2. Identify root causes of mistakes.
3. Estimate concept mastery.
4. Recommend the highest-value study targets.
5. Track learning progress over time.

---

# MVP Scope

The MVP intentionally excludes:

* General note-taking
* Assignment management
* Calendars
* Social features
* Full Obsidian-style graph visualization
* Mobile app

The MVP focuses entirely on SAT performance analysis.

---

# User Flow

## Step 1: Account Creation

Student creates account.

---

## Step 2: Import Practice Data

Student uploads:

* Bluebook score report
* Practice test results
* Question performance data

System parses results.

---

## Step 3: Knowledge Graph Generation

ComsOS maps questions to concepts.

Example:

Question #12

Concepts:

* Functions
* Quadratic Modeling
* Algebraic Manipulation

The system updates mastery estimates.

---

## Step 4: Root Cause Analysis

Instead of:

"Missed 8 function questions."

ComsOS produces:

"62% of missed function questions appear related to weak algebraic manipulation."

---

## Step 5: Study Recommendations

System ranks concepts by expected score improvement.

Example:

1. Algebraic Manipulation (+35 points)
2. Linear Modeling (+20 points)
3. Data Interpretation (+8 points)

---

## Core Features

### Feature 1: SAT Concept Graph

Description:

Internal knowledge graph representing SAT concepts and prerequisite relationships.

Examples:

Algebra
→ Functions
→ Quadratics
→ Exponential Models

Reading Inference
→ Evidence Selection
→ Author Perspective

Requirements:

* Concept nodes
* Relationship edges
* Subject categories
* Prerequisite tracking

---

### Feature 2: Student Knowledge Model

Description:

Tracks mastery of every concept.

Outputs:

* Mastery score
* Confidence score
* Last reviewed timestamp

Requirements:

* Dynamic updating
* Persistence
* Historical tracking

---

### Feature 3: Question Mapping Engine

Description:

Maps SAT questions to concepts.

Requirements:

* Manual tagging system initially
* Multiple concepts per question
* Weighted concept relevance

Example:

Question 35

Functions: 0.7

Quadratics: 0.3

---

### Feature 4: Root Cause Analysis Engine

Description:

Traverses prerequisite graph to identify likely underlying weaknesses.

Example:

Weak Projectile Motion

↓

Weak Quadratics

↓

Weak Functions

↓

Root Cause Identified

Requirements:

* Graph traversal
* Weakness propagation
* Confidence estimation

---

### Feature 5: Personalized Study Prioritization

Description:

Ranks concepts by expected score gain.

Output:

Priority List

* High Impact
* Medium Impact
* Low Impact

Requirements:

* Mastery weighting
* Frequency weighting
* Difficulty weighting

---

# Database Requirements

Existing Tables:

* Profiles
* Subjects
* Uploads
* Cards
* Decks

New Tables:

* Concepts
* ConceptRelationships
* StudentConceptMastery
* Questions
* QuestionConcepts
* LearningEvents

---

# Success Metrics

Technical

* Concept graph operational
* Root cause engine functional
* Student mastery updates correctly

User

* 20+ beta users
* 5+ active weekly users
* 100+ uploaded SAT questions analyzed

Impact

* Users report recommendations feel accurate
* Users identify weaknesses they were previously unaware of

---

# Future Versions

Version 2

* SAT study plan generation
* AI tutoring
* Automatic concept extraction
* Knowledge decay modeling

Version 3

* AP subjects
* Cross-subject reasoning
* Note ingestion
* Full academic knowledge graph

Version 4

* Complete academic operating system
* Longitudinal learning model
* College-level support
* Research-backed adaptive learning engine
