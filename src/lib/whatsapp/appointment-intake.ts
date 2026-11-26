// Structured scheduling intake. No conversation text, employee name, or medical data.
export const examTypes = ['admissional','demissional','periodico','retorno_ao_trabalho','mudanca_de_risco','outro'] as const;
export type ExamType = typeof examTypes[number];
export const appointmentStatuses = ['pendente','em_atendimento','resolvido','cancelado'] as const;
export type AppointmentStatus = typeof appointmentStatuses[number];
export type AppointmentInput = {company:string;examType:ExamType;employeeCount:number;preferredDate:string};
export type Appointment = AppointmentInput & {id:string;status:AppointmentStatus;createdAt:string;lastInteractionAt:string;updatedAt:string};

export function parseAppointmentInput(value: unknown): AppointmentInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('INVALID_APPOINTMENT');
  const v = value as Record<string,unknown>;
  if (Object.keys(v).some(k => !['company','examType','employeeCount','preferredDate'].includes(k))) throw new Error('INVALID_APPOINTMENT');
  const company = typeof v.company === 'string' ? v.company.trim() : '';
  const examType = v.examType as ExamType;
  const employeeCount = v.employeeCount;
  const date = typeof v.preferredDate === 'string' ? v.preferredDate : '';
  if (!company || company.length > 100 || /[\r\n\u0000-\u001f]/.test(company) ||
      !examTypes.includes(examType) || typeof employeeCount !== 'number' || !Number.isInteger(employeeCount) ||
      employeeCount < 1 || employeeCount > 1000 || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error('INVALID_APPOINTMENT');
  const parsed = new Date(date+'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10)!==date)
    throw new Error('INVALID_APPOINTMENT');
  return { company, examType, employeeCount, preferredDate:date };
}
export function parseAppointmentStatus(value: unknown): AppointmentStatus {
  if (typeof value !== 'string' || !appointmentStatuses.includes(value as AppointmentStatus)) throw new Error('INVALID_STATUS');
  return value as AppointmentStatus;
}
export function isOverdue(record:Pick<Appointment,'status'|'lastInteractionAt'>, now=Date.now()): boolean {
  return (record.status==='pendente' || record.status==='em_atendimento') &&
    Number.isFinite(Date.parse(record.lastInteractionAt)) &&
    now-Date.parse(record.lastInteractionAt)>=24*60*60*1000;
}
