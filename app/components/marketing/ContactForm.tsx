import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";

interface ContactFormProps {
  onFormSubmit?: () => void;
}

export const ContactForm = ({ onFormSubmit }: ContactFormProps) => {
  const [formData, setFormData] = useState({
    consumo: '',
    nomeCompleto: '',
    email: '',
    telefone: '',
    cidade: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/forms/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; retryAfterSec?: number }
        | null;

      if (response.ok && result?.ok) {
        if (window.dataLayer) {
          window.dataLayer.push({
            event: "form_submission",
            form_name: "contact_form",
            consumo_economizar: formData.consumo,
            cidade_usuario: formData.cidade,
          });
        }

        toast.success("Sua solicitação foi enviada com sucesso!");
        setFormData({
          consumo: "",
          nomeCompleto: "",
          email: "",
          telefone: "",
          cidade: "",
        });
        onFormSubmit?.();
      } else {
        toast.error(result?.error || "Erro ao enviar a solicitação. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao enviar o formulário:", error);
      toast.error("Ocorreu um erro inesperado. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex h-full flex-col">
          <Label htmlFor="consumo" className="mb-2 block text-left">Quanto você quer economizar em Kw/h por mês?</Label>
          <Input
            id="consumo"
            type="number"
            min="0"
            step="1"
            placeholder="Consumo"
            value={formData.consumo}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            className="mt-auto"
          />
        </div>
        <div className="flex h-full flex-col">
          <Label htmlFor="nomeCompleto" className="mb-2 block text-left">Seu nome Completo:</Label>
          <Input
            id="nomeCompleto"
            type="text"
            placeholder="Nome"
            value={formData.nomeCompleto}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            className="mt-auto"
          />
        </div>
        <div className="flex h-full flex-col">
          <Label htmlFor="email" className="mb-2 block text-left">Seu melhor e-mail:</Label>
          <Input
            id="email"
            type="email"
            placeholder="E-mail"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            className="mt-auto"
          />
        </div>
        <div className="flex h-full flex-col">
          <Label htmlFor="telefone" className="mb-2 block text-left">Seu telefone:</Label>
          <Input
            id="telefone"
            type="tel"
            placeholder="Telefone"
            value={formData.telefone}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            className="mt-auto"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="cidade" className="mb-2 block text-left">Sua Cidade:</Label>
          <Input
            id="cidade"
            type="text"
            placeholder="Cidade"
            value={formData.cidade}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        <div className="md:col-span-2 flex justify-center mt-4">
          <Button type="submit" size="lg" className="w-full px-12 md:w-auto" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </form>
    </div>
  );
};
