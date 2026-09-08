export class OnboardingOptionResponse {
  key: string;
  value: string;
  label: string;
}

export class OnboardingQuestionResponse {
  id: number;
  key: string;
  title: string;
  minSelect: number;
  maxSelect: number | null;
  options: OnboardingOptionResponse[];
}
