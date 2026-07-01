export interface QuestionRecord {
  id: string;
  user_id: string;
  package_id: string;
  title: string | null;
  question_text: string;
  source: string | null;
  difficulty: number;
  created_at: string;
  updated_at: string | null;
}

export interface QuestionConceptLink {
  id: string;
  package_id: string;
  question_id: string;
  concept_id: string;
  weight: number;
  created_at: string | null;
}

export interface QuestionConceptWeightInput {
  concept_id: string;
  weight: number;
}

export interface QuestionConceptAssociation {
  question_concept: QuestionConceptLink;
  concept: {
    id: string;
    package_id: string;
    slug: string;
    name: string;
    description: string | null;
    domain: string;
    difficulty: number;
    created_at: string | null;
    updated_at: string | null;
  };
}

export interface QuestionByConceptAssociation {
  question_concept: QuestionConceptLink;
  question: QuestionRecord;
}

export interface QuestionDetail {
  question: QuestionRecord;
  concepts: QuestionConceptAssociation[];
}

export interface QuestionCreateInput {
  package_slug: string;
  title?: string | null;
  question_text: string;
  source?: string | null;
  difficulty?: number;
  concepts?: QuestionConceptWeightInput[];
}

export interface QuestionUpdateInput {
  title?: string | null;
  question_text?: string | null;
  source?: string | null;
  difficulty?: number | null;
  concepts?: QuestionConceptWeightInput[] | null;
}
