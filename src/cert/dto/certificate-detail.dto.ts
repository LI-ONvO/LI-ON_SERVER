export class ExamScheduleResponse {
  implYy: number;
  implSeq: string;
  docRegStartDt: string | null;
  docRegEndDt: string | null;
  docExamStartDt: string | null;
  docExamEndDt: string | null;
  docPassDt: string | null;
  pracRegStartDt: string | null;
  pracRegEndDt: string | null;
  pracExamStartDt: string | null;
  pracExamEndDt: string | null;
  pracPassDt: string | null;
}

export class CertificateDetailResponse {
  jmCd: string;
  name: string;
  category: string | null;
  description: string | null;
  docPassRate: number | null;
  pracPassRate: number | null;
  docFee: number | null;
  pracFee: number | null;
  examSchedules: ExamScheduleResponse[];
}
