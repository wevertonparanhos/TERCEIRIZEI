import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const WHATSAPP_NUMBER = "5531983546696";
export const WHATSAPP_URL = "https://wa.me/message/3UY5DBWZGJMJN1";

export const INSTAGRAM_URL = "https://instagram.com/terceirizeibpo";
export const EMAIL = "contato@terceirizei.com.br";
export const PHONE = "(31) 98354-6696";
export const CNPJ = "50.821.759/0001-03";
