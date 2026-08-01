export interface ProductData {
  name: string;
  slug: string; // Usado para a URL da página de detalhes do produto
  shortDescription: string; // Descrição concisa para listagens e cards
  mainImage: string; // Imagem principal para cards e hero da página de detalhes
  fullDescription: string; // Descrição completa para a página de detalhes
  galleryImages?: string[]; // Imagens adicionais para uma galeria na página de detalhes
}

export const productsData: ProductData[] = [
  {
    name: "Desumidificação de Ambientes",
    slug: "desumidificacao-de-ambientes",
    shortDescription: "Soluções eficientes para controle de umidade, garantindo ambientes mais saudáveis e confortáveis.",
    mainImage: "/desumidificacao1.webp",
    fullDescription: "No inverno a intensa evaporação da água da piscina aumenta a umidade no ambiente deixando-o desconfortável e exposto a ação degradante do mofo e cheiro forte. A climatização do ambiente da piscina através de desumidificadores são a melhor solução, além de totalmente automatizados.\n\nPreservação e muito conforto: O uso dos desumidificadores garante ao seu ambiente uma melhor conservação contra a umidade e promove um espaço agradável de convívio ao redor da piscina.\n\nPlanejamentos dos dutos: As unidades desumidificadoras são colocadas em locais técnicos e ligadas ao ambiente da piscina por um sistema de dutos (aéreos ou embutidos no piso) de insuflamento e retorno.\n\nGerenciamento remoto: A Thermal projeta o controle e acionamento do sistema com a utilização de quadro elétrico e termostatos com o gerenciamento remoto.",
    galleryImages: ["/desumidificacao1.webp", "/desumidificacao2.webp"]
  },
  {
    name: "Energia Solar",
    slug: "energia-solar",
    shortDescription: "Sistemas fotovoltaicos completos para geração de energia limpa e economia na sua conta de luz.",
    mainImage: "/enerdiasolar.webp",
    fullDescription: "Em 2018, começamos a oferecer Energia Solar Fotovoltaica para atender uma nova demanda dos nossos clientes: reduzir a fatura de energia elétrica. Com aumento de utensílios elétricos dentro de casa, em indústrias e no agronegócio, as faturas de energia subiram e a energia solar oferece uma solução ecológica e econômica para reduzir o gasto com energia. Com mais de 450 sistemas projetados e instalados em todo o Rio Grande do Sul e Santa Catarina, contamos com equipe capacitada para realizar estudos e projetos personalizados para indústrias, estabelecimentos comerciais, agroindústrias e residências.\n\nRenovável e inesgotável: Utiliza a luz do sol, uma fonte de energia que se regenera continuamente.\n\nLimpa e sustentável: Não emite gases de efeito estufa ou outros poluentes durante a geração de eletricidade, contribuindo para a redução da dependência de combustíveis fósseis e o combate às mudanças climáticas.\n\nModular e versátil: Pode ser instalada em pequena escala (residências) ou em grandes usinas, sendo possível adaptar o sistema a diferentes necessidades e espaços.\n\nBaixa manutenção: Após a instalação, os sistemas fotovoltaicos geralmente exigem pouca manutenção.\n\nSilenciosa: A geração de energia é silenciosa, não produzindo ruído e sendo ideal para áreas urbanas.\n\nIndependente: Sistemas podem ser instalados em locais remotos, sem necessidade de conexão com a rede elétrica convencional (sistemas off-grid).\n\nDurabilidade: As placas solares têm vida útil longa, muitas vezes acima de 25 anos.",
    galleryImages: ["/enerdiasolar.webp"] // Adicionando a imagem principal também na galeria
  },
  {
    name: "Aquecedor Solar de Piscina",
    slug: "aquecedor-solar-de-piscina",
    shortDescription: "Aproveite sua piscina o ano todo com sistemas de aquecimento eficientes e sustentáveis, adaptados à sua necessidade.",
    mainImage: "/aquecedorsolardepiscina1.webp",
    fullDescription: "A Thermal oferece uma gama completa de sistemas de aquecimento para piscinas, garantindo que você encontre a solução perfeita para sua obra. Seja qual for a sua necessidade, desde piscinas residenciais até grandes complexos comerciais, temos a expertise para proporcionar o conforto térmico ideal.\n\nVariedade de fontes de energia: Escolha entre sistemas solares, à lenha, a gás (GLP/GN), a diesel, elétricos ou a pellets, adaptando-se à sua preferência e disponibilidade.\n\nSistemas inteligentes e automatizados: Para piscinas de uso comum (clubes, academias, hotéis, spas), desenvolvemos soluções que garantem aquecimento contínuo, com automação e interligação com sistemas de calefação existentes.\n\nAdaptabilidade total: Nossos sistemas se ajustam perfeitamente a qualquer tipo e tamanho de piscina, seja ela interna ou externa, grande ou pequena, assegurando eficiência e desempenho.",
    galleryImages: ["/aquecedorsolardepiscina1.webp", "/aquecedorsolardepiscina2.webp"]
  },
  {
    name: "Reservatórios de Água Quente",
    slug: "reservatorios-de-agua-quente",
    shortDescription: "Reservatórios de alta capacidade e isolamento térmico para garantir água quente sempre disponível.",
    mainImage: "/reservatoriodeaguaquente1.webp",
    fullDescription: "Os depósitos de água quente são fabricados nas capacidades de 250 a 12.000 litros. Eles dispõem de resistência elétrica de apoio comandada por um termostato de alta sensibilidade com temperatura regulável, destinado a manter um volume mínimo de água aquecida, atende a utilização normal e também nos períodos prolongados de ausência de sol.\n\nCapacidade e apoio elétrico: Fabricados em capacidades de 250 a 12.000 litros, com resistência elétrica de apoio e termostato de alta sensibilidade para garantir água aquecida mesmo sem sol.\n\nMateriais de alta qualidade: A Thermal aplica os parâmetros para utilização da água com composição físico-química em conformidade para a aplicação de produtos fabricados com Aço Inox AISI 304, Aço Inox AISI 316, Aço inox AISI 316L e Aço 444, garantindo durabilidade e conformidade.",
    galleryImages: ["/reservatoriodeaguaquente1.webp", "/reservatoriodeaguaquente2.webp"]
  },
  {
    name: "Geradoras de Calor de Piso",
    slug: "geradoras-de-calor-de-piso",
    shortDescription: "Sistemas de aquecimento de piso radiante para um conforto térmico uniforme e discreto.",
    mainImage: "/gereadoradecalordepiso.webp",
    fullDescription: "De fabricação italiana, modelo de alto rendimento, dotada de queimador a gás (GLP/NATURAL) ou óleo diesel, inteiramente automático e de um termostato duplo, sendo um de comando para regular a temperatura de água e outro de segurança.\n\nGrupo térmico com queimador a óleo diesel, queimador a gás GLP/GN de fabricação italiana.\n\nCaldeiras compactas que garantem confiança, durabilidade e tecnologia de alto nível.\n\nCompleta acessibilidade e facilidade no manuseio.\n\nPossui em sua estrutura amplas passagens e uma abertura frontal completa, permitindo um acesso fácil para manutenção.\n\nCorpo em ferro fundido de grande espessura, 3 passagens.\n\nAlto rendimento (>91%).\n\nCompleta afinidade com queimadores a gás (GLP ou GN) e diesel.\n\nBaixo Nox.",
    galleryImages: ["/gereadoradecalordepiso.webp"]
  },
  {
    name: "Radiadores Hidráulicos",
    slug: "radiadores-hidraulicos",
    shortDescription: "Radiadores modernos e eficientes para aquecimento central, com design que se integra a qualquer ambiente.",
    mainImage: "/radiadoreshidraulicos.webp",
    fullDescription: "A Thermal trabalha com modelos de radiadores de fabricação italiana, eficientes e discretos, eles podem compor qualquer ambiente, sem comprometer a sua decoração. Em alguns casos, podem até ser um objeto decorativo, personalizados compondo um estilo europeu ao ambiente.\n\nAquecimento rápido e eficiente: Proporcionam calor de forma ágil e uniforme, ideal para aquecer ambientes rapidamente.\n\nMelhor opção para casas já habitadas: Sua instalação é menos invasiva, tornando-os perfeitos para imóveis já construídos.\n\nRetira o mofo e a umidade indesejável dos ambientes: Contribuem para um ambiente mais saudável, eliminando problemas causados pela umidade excessiva.\n\nSão modulares, variando alturas e larguras de acordo com a necessidade térmica de cada ambiente: Flexibilidade para se adaptar a diferentes espaços e demandas de aquecimento.\n\nAtravés do termostato é possível o controle total e independente da temperatura em cada ambiente: Permite personalizar o conforto térmico em cada cômodo, otimizando o consumo de energia.\n\nValoriza o imóvel: Além do conforto, agregam valor estético e funcional à propriedade.\n\nSão totalmente silenciosos: Operam sem ruídos, garantindo um ambiente tranquilo e agradável.",
    galleryImages: ["/radiadoreshidraulicos.webp"]
  },
  {
    name: "Piso Elétrico",
    slug: "piso-eletrico",
    shortDescription: "Soluções de aquecimento de piso elétrico para instalação rápida e controle preciso da temperatura.",
    mainImage: "/pisoeletrico1.webp",
    fullDescription: "O Piso Elétrico proporciona conforto e aconchego nos ambientes, e mesmo num dia frio e úmido, transmite uma sensação de bem-estar. O calor se propaga por todo o ambiente, distribuindo calor uniforme e provendo um aquecimento homogêneo.\n\nPode ser instalado em conjunto com sistemas fotovoltaicos, podendo auto-sustentável: Integração com energia solar para maior sustentabilidade e economia.\n\nAquece qualquer tipo de piso: Versatilidade para ser aplicado sob diversos revestimentos.\n\nRetira a umidade e mofo: Contribui para um ambiente mais saudável e livre de problemas de umidade.\n\nNão interfere na decoração: Sistema invisível que não compromete a estética do ambiente.\n\nNão produz ruídos: Operação silenciosa para um conforto ininterrupto.\n\nNão exige manutenção: Uma vez instalado, o sistema demanda pouca ou nenhuma manutenção.\n\nValoriza o seu imóvel: Agrega valor e modernidade à propriedade.\n\nOs termostatos podem ser analógicos, digitais programáveis, touch screen, wifi: Controle preciso e personalizável da temperatura em cada ambiente.",
    galleryImages: ["/pisoeletrico1.webp", "/pisoeletrico2.webp"]
  },
  {
    name: "Tubos a Vácuo",
    slug: "tubos-a-vacuo",
    shortDescription: "Tecnologia avançada em tubos a vácuo para aquecimento solar de alta performance e durabilidade.",
    mainImage: "/tuboavacuo.webp",
    fullDescription: "Os solares de Tubo Vácuo proporcionam grande aproveitamento na absorção dos raios solares. Reduzem o consumo de energia referente ao aquecimento de água. Podem ser aplicado em residências, indústrias, academias, clubes, hospitais e etc. Montados em tamanhos modulados com baterias de baixa e alta pressão são normalmente são instalados sobre o telhado da residência.\n\nAlta eficiência: O vácuo entre as camadas de vidro age como isolante térmico, e o revestimento seletivo absorve a radiação solar de forma eficiente, minimizando a perda de calor por condução e convecção.\n\nDesempenho em dias nublados: Capaz de absorver a radiação solar difusa, garantindo aquecimento mesmo em condições de baixa insolação.\n\nResistência a intempéries: Projetados para suportar baixas temperaturas e geadas, sendo ideais para regiões frias.\n\nEstrutura: Consistem em dois tubos de vidro concêntricos, sendo o vidro externo transparente e o interno revestido com camadas de absorção e reflexão.\n\nIsolamento: O espaço entre os tubos é preenchido com vácuo, que funciona como um isolante térmico de alta performance.\n\nSustentabilidade: São uma solução ecológica que reduz o consumo de energia elétrica para aquecimento de água.",
    galleryImages: ["/tuboavacuo.webp"]
  },
  {
    name: "Geradoras Murais",
    slug: "geradoras-murais",
    shortDescription: "Geradoras de calor murais compactas e eficientes, ideais para espaços menores e aquecimento pontual.",
    mainImage: "/geradorasmurais.webp",
    fullDescription: "Geradora de água quente a gás, de fabricação italiana, tem um excelente poder de aquecimento instantâneo para uma boa vazão de água. Ideais para uso combinado de aquecimento de ambiente (piso ou radiadores) e água quente de consumo diário.\n\nEmissão mínima de poluentes: Performance classe 5 (EN 483).\n\nUso combinado de: Calefação (piso aquecido e/ou radiador) e aquecimento de água uso diário.\n\nCombustível: Gás GLP / GN - Gás Natural.\n\nResidencial ou comercial (espaços compactos).",
    galleryImages: ["/geradorasmurais.webp"]
  },
];