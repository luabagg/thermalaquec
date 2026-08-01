import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { FORMSPREE, whatsappHref } from "~/lib/site";
import { toast } from "sonner";

interface ContactFormProps {
  onFormSubmit?: () => void; // Callback para ser chamado após o envio bem-sucedido
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

  const whatsappRedirectUrl = whatsappHref(
    "Olá! Acabei de enviar o formulário de contato no site da Thermal e gostaria de continuar a conversa por aqui.",
  );

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
      const response = await fetch(FORMSPREE.contact, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Dispara evento GTM de sucesso do formulário
        if (window.dataLayer) {
          window.dataLayer.push({
            event: 'form_submission',
            form_name: 'contact_form',
            consumo_economizar: formData.consumo,
            cidade_usuario: formData.cidade,
          });
        }

        toast.success("Sua solicitação foi enviada com sucesso! Redirecionando para o WhatsApp...");
        setFormData({
          consumo: '',
          nomeCompleto: '',
          email: '',
          telefone: '',
          cidade: '',
        });
        if (onFormSubmit) {
          onFormSubmit(); // Chama o callback para fechar o dialog, se houver
        }
        // Redireciona para o WhatsApp após um pequeno atraso para o toast ser visível
        setTimeout(() => {
          window.open(whatsappRedirectUrl, "_blank");
        }, 1500); 
      } else {
        const errorData = await response.json();
        toast.error(`Erro ao enviar a solicitação: ${errorData.error || 'Tente novamente.'}`);
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
            step="10"
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