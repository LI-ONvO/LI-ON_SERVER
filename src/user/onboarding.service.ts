import { Injectable } from '@nestjs/common';
import { Field, Prisma } from 'generated/prisma/client';
import { ValidationErrorException } from '../common/exception/service.exception';
import { PrismaService } from '../common/prisma/prisma.service';
import { OnboardingQuestionResponse } from './dto/onboarding-question.dto';
import {
  SubmitOnboardingRequest,
  SubmitOnboardingResponse,
} from './dto/submit-onboarding.dto';

type OptionWithField = Prisma.OnboardingOptionGetPayload<{
  include: { field: true };
}>;

@Injectable()
export class OnboardingService {
  constructor(private readonly prismaService: PrismaService) {}

  async getQuestions(): Promise<OnboardingQuestionResponse[]> {
    const questions = await this.prismaService.onboardingQuestion.findMany({
      where: { is_active: true },
      orderBy: { order_no: 'asc' },
      include: {
        options: { where: { is_active: true }, orderBy: { order_no: 'asc' } },
      },
    });

    return questions.map((question) => ({
      id: question.id,
      key: question.question_key,
      title: question.title,
      minSelect: question.min_select,
      maxSelect: question.max_select,
      options: question.options.map((option) => ({
        key: option.option_key,
        value: option.value,
        label: option.label,
      })),
    }));
  }

  async submit(
    userId: number,
    request: SubmitOnboardingRequest,
  ): Promise<SubmitOnboardingResponse> {
    const questions = await this.prismaService.onboardingQuestion.findMany({
      where: { is_active: true },
      orderBy: { order_no: 'asc' },
      include: {
        options: {
          where: { is_active: true },
          orderBy: { order_no: 'asc' },
          include: { field: true },
        },
      },
    });

    const submitted = new Map(
      request.answers.map((answer) => [
        answer.questionKey,
        answer.optionValues,
      ]),
    );

    if (submitted.size !== request.answers.length) {
      throw ValidationErrorException('문항은 한 번만 제출해야 합니다.');
    }

    for (const questionKey of submitted.keys()) {
      if (
        !questions.some((question) => question.question_key === questionKey)
      ) {
        throw ValidationErrorException(
          `존재하지 않는 질문입니다: ${questionKey}`,
        );
      }
    }

    const selectedOptions: OptionWithField[] = [];

    for (const question of questions) {
      const values = [...new Set(submitted.get(question.question_key) ?? [])];

      if (
        values.length < question.min_select ||
        (question.max_select !== null && values.length > question.max_select)
      ) {
        throw ValidationErrorException(
          `${question.question_key} 는 ${question.min_select}~${question.max_select ?? '제한 없음'} 개를 선택해야 합니다.`,
        );
      }

      for (const value of values) {
        const option = question.options.find((it) => it.value === value);

        if (!option) {
          throw ValidationErrorException(
            `${question.question_key} 에 존재하지 않는 선택지입니다: ${value}`,
          );
        }

        selectedOptions.push(option);
      }
    }

    // 서로 다른 문항이 같은 분야를 가리킬 수 있어 field_id 로 중복을 제거한다.
    const desiredFields = [
      ...new Map(
        selectedOptions
          .filter(
            (option): option is OptionWithField & { field: Field } =>
              option.field !== null,
          )
          .map((option) => [option.field.id, option.field]),
      ).values(),
    ];

    await this.prismaService.$transaction([
      this.prismaService.onboardingAnswer.deleteMany({
        where: { user_id: userId },
      }),
      this.prismaService.userDesiredField.deleteMany({
        where: { user_id: userId },
      }),
      this.prismaService.onboardingAnswer.createMany({
        data: selectedOptions.map((option) => ({
          user_id: userId,
          question_id: option.question_id,
          option_id: option.id,
        })),
      }),
      this.prismaService.userDesiredField.createMany({
        data: desiredFields.map((field) => ({
          user_id: userId,
          field_id: field.id,
        })),
      }),
      this.prismaService.user.update({
        where: { id: userId },
        data: { is_onboarded: true, onboarded_at: new Date() },
      }),
    ]);

    return {
      desiredFields: desiredFields.map((field) => ({
        id: field.id,
        name: field.name,
      })),
    };
  }
}
