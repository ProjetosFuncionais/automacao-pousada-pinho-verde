import { z } from 'zod';
import { extrairDigitos, validarCpfBrasileiro } from '../utils/formatters';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail corporativo.')
    .email('Informe um endereço de e-mail válido.'),
  password: z
    .string()
    .min(6, 'A senha deve possuir pelo menos 6 caracteres.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const reservaSchema = z
  .object({
    nome_completo: z
      .string()
      .trim()
      .min(3, 'Informe o nome completo do hóspede (mínimo 3 caracteres).')
      .max(150, 'O nome completo deve ter no máximo 150 caracteres.'),
    cpf: z
      .string()
      .trim()
      .min(1, 'O CPF do hóspede é obrigatório.')
      .refine((val) => validarCpfBrasileiro(val), {
        message: 'Informe um CPF válido (ex: 000.000.000-00).',
      }),
    whatsapp: z
      .string()
      .trim()
      .min(1, 'O WhatsApp de contato é obrigatório.')
      .refine(
        (val) => {
          const digitos = extrairDigitos(val);
          return digitos.length === 10 || digitos.length === 11;
        },
        {
          message: 'Informe um WhatsApp válido com DDD (10 ou 11 dígitos).',
        }
      ),
    endereco: z
      .string()
      .trim()
      .min(5, 'Informe o endereço completo do hóspede (mínimo 5 caracteres).'),
    numero_chale: z
      .string()
      .trim()
      .min(1, 'Selecione ou informe o número/nome do chalé.')
      .max(50, 'A identificação do chalé deve ter no máximo 50 caracteres.'),
    quantidade_pessoas: z
      .number()
      .int('A quantidade de pessoas deve ser um número inteiro.')
      .gt(0, 'A quantidade de pessoas deve ser maior que zero.'),
    data_checkin: z
      .string()
      .min(1, 'A data de check-in é obrigatória.')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data de check-in válida.'),
    data_checkout: z
      .string()
      .min(1, 'A data de check-out é obrigatória.')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data de check-out válida.'),
    valor_total_hospedagem: z
      .number()
      .min(0, 'O valor total da hospedagem não pode ser negativo.'),
    valor_total_pago: z
      .number()
      .min(0, 'O valor total pago não pode ser negativo.'),
    descricao: z.string().optional().nullable(),
  })
  .superRefine((dados, ctx) => {
    if (dados.data_checkin && dados.data_checkout) {
      if (dados.data_checkout <= dados.data_checkin) {
        ctx.addIssue({
          code: 'custom',
          path: ['data_checkout'],
          message: 'A data de check-out deve ser posterior à data de check-in.',
        });
      }
    }

    if (
      typeof dados.valor_total_pago === 'number' &&
      typeof dados.valor_total_hospedagem === 'number' &&
      dados.valor_total_pago > dados.valor_total_hospedagem
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['valor_total_pago'],
        message: 'O valor pago não pode ser maior que o valor total da hospedagem.',
      });
    }
  });

export type ReservaFormValues = z.infer<typeof reservaSchema>;
