import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { submitMarketingForm } from "~/utils/submit-marketing-form";
import { toast } from "sonner";

interface ContactFormProps {
  onFormSubmit?: () => void;
}

export const ContactForm = ({ onFormSubmit }: ContactFormProps) => {
  const [formData, setFormData] = useState({
    consumo: "",
    nomeCompleto: "",
    email: "",
    telefone: "",
    cidade: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormError(null);
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = await submitMarketingForm("contact", formData);

      if (result.ok) {
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
        setFormError(result.error);
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Erro ao enviar o formulário:", error);
      const message = "Ocorreu um erro inesperado. Por favor, tente novamente.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {formError ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-left text-sm text-destructive md:col-span-2"
          >
            {formError}
          </div>
        ) : null}
        <div className="flex h-full flex-col">
          <Label htmlFor="consumo" className="mb-2 block text-left">
            Quanto você quer economizar em Kw/h por mês?
          </Label>
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
          <Label htmlFor="nomeCompleto" className="mb-2 block text-left">
            Seu nome Completo:
          </Label>
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
          <Label htmlFor="email" className="mb-2 block text-left">
            Seu melhor e-mail:
          </Label>
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
          <Label htmlFor="telefone" className="mb-2 block text-left">
            Seu telefone:
          </Label>
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
          <Label htmlFor="cidade" className="mb-2 block text-left">
            Sua Cidade:
          </Label>
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
        <div className="mt-4 flex justify-center md:col-span-2">
          <Button type="submit" size="lg" className="w-full px-12 md:w-auto" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </form>
    </div>
  );
};
