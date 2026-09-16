type OnboardingAnswerRow = {
  question: { id: number; title: string; order_no: number };
  option: { label: string; order_no: number };
};

// AI 서버 요청
export const toOnboardingPayload = (
  answers: OnboardingAnswerRow[],
): { title: string; values: string[] }[] => {
  const questions = new Map<
    number,
    {
      title: string;
      orderNo: number;
      options: OnboardingAnswerRow['option'][];
    }
  >();

  for (const answer of answers) {
    const question = questions.get(answer.question.id) ?? {
      title: answer.question.title,
      orderNo: answer.question.order_no,
      options: [],
    };

    question.options.push(answer.option);
    questions.set(answer.question.id, question);
  }

  return [...questions.values()]
    .sort((left, right) => left.orderNo - right.orderNo)
    .map((question) => ({
      title: question.title,
      values: question.options
        .sort((left, right) => left.order_no - right.order_no)
        .map((option) => option.label),
    }));
};
