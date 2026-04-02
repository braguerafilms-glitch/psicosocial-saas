export type CampaignStatus = "draft" | "active" | "closed" | "reported";

export interface Engineer {
  id: string;
  user_id: string;
  name: string;
  crea: string;
  company_name: string;
  logo_url: string | null;
  avatar_url: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
}

export interface Company {
  id: string;
  engineer_id: string;
  name: string;
  trade_name: string | null;
  cnpj: string | null;
  logo_url: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  employee_count: number | null;
  status: "active" | "inactive";
}

export interface Campaign {
  id: string;
  company_id: string;
  engineer_id: string;
  title: string;
  slug: string;
  status: CampaignStatus;
  opens_at: string | null;
  closes_at: string | null;
  custom_message: string | null;
  anonymous: boolean;
}

export interface EmployeeResponse {
  id: string;
  campaign_id: string;
  department: string | null;
  job_level: string | null;
  gender: string | null;
  age_range: string | null;
  tenure_range: string | null;
  work_type: string | null;
  submitted_at: string;
}

export interface QuestionAnswer {
  id: string;
  response_id: string;
  question_id: number;
  score: number;
}

export type RiskLevel =
  | "muito_positivo"
  | "positivo"
  | "aceitavel"
  | "moderado"
  | "elevado";

export interface DimensionScore {
  dimension: string;
  label: string;
  avg_score: number;
  score_pct: number;
  risk_level: RiskLevel;
  respondents: number;
  benchmark: number | null;
}

export interface ReportData {
  campaign: Campaign;
  company: Company;
  engineer: Engineer;
  total_responses: number;
  dimensions: DimensionScore[];
  demographics: Record<string, Record<string, number>>;
}
