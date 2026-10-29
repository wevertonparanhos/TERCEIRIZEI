import { z } from "zod";

/** Tipo de solicitação: só o nome — é uma etiqueta que identifica o serviço. */
export const serviceTypeNameSchema = z.string().trim().min(2, "Dê um nome ao tipo.").max(80, "O nome pode ter até 80 caracteres.");
