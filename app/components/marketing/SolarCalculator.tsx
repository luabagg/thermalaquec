import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card } from "~/components/ui/card";
import { FadeInOnScroll } from './FadeInOnScroll';
import { PANELS, PRICING, UTILITIES } from '~/data/calculator-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import { cn } from "~/lib/utils";
import InputMaskLib from "react-input-mask";
import { NumericFormat } from "react-number-format";
import { FORMSPREE } from "~/lib/site";

// react-input-mask typings disagree with React 18 JSX element types
const InputMask = InputMaskLib as unknown as React.ComponentType<
  React.ComponentProps<"input"> & {
    mask: string;
    maskChar?: string | null;
  }
>;

const UF_DATA: { [key: string]: { hsp: number } } = {
  "AC": { hsp: 5.0 }, "AL": { hsp: 5.6 }, "AM": { hsp: 4.5 },
  "AP": { hsp: 4.7 }, "BA": { hsp: 5.7 }, "CE": { hsp: 5.8 },
  "DF": { hsp: 5.6 }, "ES": { hsp: 5.2 }, "GO": { hsp: 5.5 },
  "MA": { hsp: 5.3 }, "MG": { hsp: 5.4 }, "MS": { hsp: 5.4 },
  "MT": { hsp: 5.7 }, "PA": { hsp: 4.6 }, "PB": { hsp: 5.7 },
  "PE": { hsp: 5.6 }, "PI": { hsp: 5.9 }, "PR": { hsp: 4.3 },
  "RJ": { hsp: 5.1 }, "RN": { hsp: 5.7 }, "RO": { hsp: 5.2 },
  "RR": { hsp: 5.1 }, "RS": { hsp: 3.96 },
  "SC": { hsp: 4.6 }, "SE": { hsp: 5.6 }, "SP": { hsp: 4.8 },
  "TO": { hsp: 5.5 }
};

const formatBrazilianCurrency = (value: number, decimals: number = 2): string => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatNumber = (value: number, decimals: number = 0): string => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export const SolarCalculator = () => {
  const [activeTab, setActiveTab] = useState("simulacao");
  const [formData, setFormData] = useState({
    cep: '',
    uf: '', // Inicializado como vazio, será preenchido pelo CEP
    accountValue: '', // Armazenará o valor numérico como string (ex: "2500.00")
    utilityId: UTILITIES[0].id,
    email: '',
    nomeCompleto: '',
    telefone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [fetchedLocation, setFetchedLocation] = useState<string | null>(null);

  const [results, setResults] = useState<{
    generation: number | null;
    systemPower: number | null;
    annualSaving: number | null;
    payback: number | null;
    modulesCount: number | null;
    areaNeeded: number | null;
    investmentMin: number | null;
    investmentMax: number | null;
  } | null>(null);

  const handleChange = (id: string, value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handleCepBlur = async () => {
    const cleanedCep = formData.cep.replace(/\D/g, '');
    if (cleanedCep.length !== 8) {
      setCepError('CEP inválido. Digite 8 dígitos.');
      setFetchedLocation(null);
      setFormData(prev => ({ ...prev, uf: '' }));
      return;
    }

    setCepLoading(true);
    setCepError(null);
    setFetchedLocation(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setCepError('CEP não encontrado.');
        setFormData(prev => ({ ...prev, uf: '' }));
      } else {
        const locationParts = [];
        if (data.logradouro) locationParts.push(data.logradouro);
        if (data.bairro) locationParts.push(data.bairro);
        if (data.localidade) locationParts.push(data.localidade);
        if (data.uf) locationParts.push(data.uf);
        setFetchedLocation(locationParts.join(' - '));
        setFormData(prev => ({ ...prev, uf: data.uf }));
      }
    } catch (error) {
      console.error("Erro ao consultar CEP:", error);
      setCepError('Erro ao consultar CEP. Tente novamente.');
      setFormData(prev => ({ ...prev, uf: '' }));
    } finally {
      setCepLoading(false);
    }
  };

  const handleCalculateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Parse accountValue from string (e.g., "2500.00") to float
    const bill = parseFloat(formData.accountValue || '0');
    const ufData = UF_DATA[formData.uf];
    const selectedUtility = UTILITIES.find(u => u.id === formData.utilityId);

    if (!bill || bill <= 0 || !ufData || !selectedUtility || !formData.email || !formData.cep || !formData.uf || !formData.nomeCompleto || !formData.telefone) {
      toast.error('Por favor, preencha todos os campos obrigatórios e um CEP válido para simular.');
      setIsSubmitting(false);
      return;
    }

    const { hsp } = ufData;
    const { price_per_kwh, fixed_fee, compensable_ratio } = selectedUtility;
    const panel = PANELS[0]; 
    
    if (!panel) {
      toast.error('Erro: Nenhum modelo de módulo disponível para cálculo.');
      setIsSubmitting(false);
      return;
    }

    const pr = 0.80;

    const kwhTarget = Math.max((bill - fixed_fee), 0) / Math.max(price_per_kwh * compensable_ratio, 0.01);

    const kwp = kwhTarget / (30 * hsp * pr);

    const modulesCount = Math.ceil((kwp * 1000) / panel.watt);

    const areaNeeded = modulesCount * panel.area_m2;

    const generation = kwp * 30 * hsp * pr;

    const annualSaving = generation * 12 * (price_per_kwh * compensable_ratio);

    const investmentMin = kwp * 1000 * PRICING.price_per_wp_min;
    const investmentMax = kwp * 1000 * PRICING.price_per_wp_max;

    const monthlySaving = annualSaving / 12;
    const payback = monthlySaving > 0 ? (((investmentMin + investmentMax) / 2) / monthlySaving) : null;

    setResults({
      generation: Math.round(generation),
      systemPower: Number(kwp.toFixed(2)),
      annualSaving: Number(annualSaving.toFixed(2)),
      payback: payback ? Math.round(payback) : null,
      modulesCount,
      areaNeeded: Math.round(areaNeeded),
      investmentMin: Number(investmentMin.toFixed(2)),
      investmentMax: Number(investmentMax.toFixed(2)),
    });

    try {
      const response = await fetch(FORMSPREE.calculator, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome_completo: formData.nomeCompleto, // Renomeado
          telefone_contato: formData.telefone,    // Renomeado
          email_contato: formData.email,         // Renomeado
          cep_usuario: formData.cep,             // Renomeado
          uf_usuario: formData.uf,               // Renomeado
          valor_medio_conta_rs: formData.accountValue, // Renomeado
          concessionaria_selecionada: selectedUtility.name, // Renomeado
          
          geracao_mensal_estimada_kwh: Math.round(generation), // Renomeado
          potencia_sistema_kwp: Number(kwp.toFixed(2)),        // Renomeado
          economia_anual_estimada_rs: Number(annualSaving.toFixed(2)), // Renomeado
          payback_estimado_meses: payback ? Math.round(payback) : 'N/A', // Renomeado
          quantidade_modulos: modulesCount,                    // Renomeado
          area_necessaria_m2: Math.round(areaNeeded),          // Renomeado
          investimento_minimo_rs: Number(investmentMin.toFixed(2)), // Renomeado
          investimento_maximo_rs: Number(investmentMax.toFixed(2)), // Renomeado
          modelo_painel_selecionado: panel.model,              // Renomeado
        }),
      });

      if (response.ok) {
        if (window.dataLayer) {
          window.dataLayer.push({
            event: 'solar_calculator_submission',
            form_name: 'solar_calculator',
            nome_completo: formData.nomeCompleto,
            telefone_contato: formData.telefone,
            email_contato: formData.email,
            cep_usuario: formData.cep,
            uf_usuario: formData.uf,
            valor_medio_conta_rs: formData.accountValue,
            concessionaria_selecionada: selectedUtility.name,
            geracao_mensal_estimada_kwh: Math.round(generation),
            potencia_sistema_kwp: Number(kwp.toFixed(2)),
            economia_anual_estimada_rs: Number(annualSaving.toFixed(2)),
          });
        }
        toast.success("Sua simulação foi enviada com sucesso! Veja os resultados.");
        setActiveTab("resumo");
        setTimeout(() => {
          document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        const errorData = await response.json();
        toast.error(`Erro ao enviar a simulação: ${errorData.error || 'Tente novamente.'}`);
      }
    } catch (error) {
      console.error("Erro ao enviar o formulário:", error);
      toast.error("Ocorreu um erro inesperado. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FadeInOnScroll>
      <section className="w-full h-full flex items-center justify-center bg-transparent py-0">
        <div className="container mx-auto text-center">
          <Card className={cn(
            "p-6 shadow-lg transition-all duration-300 ease-in-out rounded-lg",
            "w-full md:max-w-[450px] h-auto"
          )}>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Calculadora Solar</h2>
            <p className="text-muted-foreground text-sm mb-6">Simule seu gerador de Energia Solar</p>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-200 rounded-md p-1">
                <TabsTrigger
                  value="simulacao"
                  className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                >
                  SIMULAÇÃO
                </TabsTrigger>
                <TabsTrigger
                  value="resumo"
                  disabled={!results}
                  className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                >
                  RESUMO
                </TabsTrigger>
              </TabsList>
              <TabsContent value="simulacao" className="mt-6">
                <form onSubmit={handleCalculateAndSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Campo de CEP e Endereço */}
                  <div>
                    <Label htmlFor="cep" className="block text-left mb-2">CEP</Label>
                    <div className="relative">
                      <InputMask
                        mask="99999-999"
                        maskChar="_"
                        id="cep"
                        type="text"
                        placeholder="Digite seu CEP"
                        value={formData.cep}
                        onChange={(e) => handleChange('cep', e.target.value)}
                        onBlur={handleCepBlur}
                        required
                        disabled={isSubmitting || cepLoading}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                      />
                      {cepLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
                      )}
                    </div>
                    {cepError && <p className="text-red-500 text-sm mt-1 text-left">{cepError}</p>}
                  </div>
                  <div className="flex flex-col justify-start">
                    {fetchedLocation && !cepError && (
                      <>
                        <Label className="block text-left mb-2">Endereço</Label>
                        <p className="text-gray-700 text-sm text-left">{fetchedLocation}</p>
                      </>
                    )}
                  </div>
                  {/* Valor médio da conta */}
                  <div className="md:col-span-2">
                    <Label htmlFor="account" className="block text-left mb-2">Valor médio da sua conta (R$)</Label>
                    <NumericFormat
                      id="accountValue"
                      value={formData.accountValue}
                      onValueChange={(values) => {
                        handleChange('accountValue', values.value); // values.value é o valor numérico como string (ex: "2500.00")
                      }}
                      thousandSeparator="."
                      decimalSeparator=","
                      prefix="R$ "
                      decimalScale={2}
                      fixedDecimalScale={true}
                      placeholder="Ex.: R$ 2.500,00"
                      disabled={isSubmitting}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  {/* Concessionária */}
                  <div className="md:col-span-2">
                    <Label htmlFor="utility-select" className="block text-left mb-2">Concessionária</Label>
                    <Select value={formData.utilityId} onValueChange={(value) => handleChange('utilityId', value)} disabled={isSubmitting}>
                      <SelectTrigger id="utility-select" className="w-full">
                        <SelectValue placeholder="Selecione sua concessionária" />
                      </SelectTrigger>
                      <SelectContent>
                        {UTILITIES.map((utility) => (
                          <SelectItem key={utility.id} value={utility.id}>
                            {utility.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* E-mail */}
                  <div className="md:col-span-2">
                    <Label htmlFor="email" className="block text-left mb-2">Seu melhor e-mail:</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Digite seu e-mail"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="w-full"
                    />
                  </div>
                  {/* Campo de Nome Completo */}
                  <div className="md:col-span-2">
                    <Label htmlFor="nomeCompleto" className="block text-left mb-2">Seu nome Completo:</Label>
                    <Input
                      id="nomeCompleto"
                      type="text"
                      placeholder="Nome Completo"
                      value={formData.nomeCompleto}
                      onChange={(e) => handleChange('nomeCompleto', e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="w-full"
                    />
                  </div>
                  {/* Campo de Telefone */}
                  <div className="md:col-span-2">
                    <Label htmlFor="telefone" className="block text-left mb-2">Seu telefone:</Label>
                    <InputMask
                      mask="(99) 99999-9999"
                      maskChar="_"
                      id="telefone"
                      type="tel"
                      placeholder="Ex.: (54) 99999-9999"
                      value={formData.telefone}
                      onChange={(e) => handleChange('telefone', e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  {/* Botão de Simular */}
                  <div className="md:col-span-2">
                    <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90 text-white" disabled={isSubmitting || cepLoading}>
                      {isSubmitting ? "Simulando..." : "Simule Grátis!"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="resumo" className="mt-6">
                {results ? (
                  <div id="results-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                    <Card className="p-4 shadow-sm">
                      <p className="text-sm text-gray-600">Geração mensal estimada</p>
                      <p className="text-xl font-bold text-gray-800">{formatNumber(results.generation || 0)} kWh/mês</p>
                    </Card>
                    <Card className="p-4 shadow-sm">
                      <p className="text-sm text-gray-600">Potência do sistema</p>
                      <p className="text-xl font-bold text-gray-800">{formatNumber(results.systemPower || 0, 2)} kWp</p>
                    </Card>
                    <Card className="p-4 shadow-sm">
                      <p className="text-sm text-gray-600">Economia anual</p>
                      <p className="text-xl font-bold text-gray-800">R$ {formatBrazilianCurrency(results.annualSaving || 0)}</p>
                    </Card>
                    <Card className="p-4 shadow-sm">
                      <p className="text-sm text-gray-600">Payback estimado</p>
                      <p className="text-xl font-bold text-gray-800">{results.payback ? `${formatNumber(results.payback)} meses` : '—'}</p>
                    </Card>
                    <Card className="p-4 shadow-sm">
                      <p className="text-sm text-gray-600">Qtd. de módulos</p>
                      <p className="text-xl font-bold text-gray-800">{formatNumber(results.modulesCount || 0)}</p>
                    </Card>
                    <Card className="p-4 shadow-sm">
                      <p className="text-sm text-gray-600">Área necessária</p>
                      <p className="text-xl font-bold text-gray-800">{formatNumber(results.areaNeeded || 0)} m²</p>
                    </Card>
                    <Card className="p-4 shadow-sm lg:col-span-3">
                      <p className="text-sm text-gray-600">Investimento estimado</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-base font-semibold text-gray-800">
                        <div>
                          <span className="text-gray-500">Menor:</span> R$ {formatBrazilianCurrency(results.investmentMin || 0)}
                        </div>
                        <div>
                          <span className="text-gray-500">Maior:</span> R$ {formatBrazilianCurrency(results.investmentMax || 0)}
                        </div>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">Preencha a simulação para ver os resultados.</p>
                )}
                <p className="text-xs text-gray-500 mt-6 text-left">
                  Estimativas baseadas em médias estaduais de HSP e tarifa da concessionária selecionada. Performance Ratio (PR): 0,80.
                </p>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </section>
    </FadeInOnScroll>
  );
};