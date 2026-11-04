const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const SOURCE_RULES = [
  { category: 'Alimentos e bebidas', pattern: /\b(food|grocery|canned food|frozen products|vegetables|greens|meat|fruits|berries|bread|pastries|sausages|fish|sea food|nut|kernel|dried fruit|grain products|coffee|milk|eggs|ready meal|water|juices|drinks|tea|snacks|beverages)\b/ },
  { category: 'Auto, Moto & Peças', pattern: /\b(automotive parts|auto parts|car parts|vehicle parts|motorcycle parts|motorcycle accessories|automotive accessories|car accessories|truck parts|motorcycle equipment|automotive maintenance)\b/ },
  { category: 'Moda e beleza', pattern: /\b(apparel|accessories|clothing|fashion|shoes|footwear|jewelry|watches|beauty|personal care|makeup|skincare|sportswears?)\b/ },
  { category: 'Bebês e crianças', pattern: /\b(mother|kids|baby|babies|infant|children|toys)\b/ },
  { category: 'Pet', pattern: /\b(pet products|pet supplies|dog|dogs|cat|cats|pet food)\b/ },
  { category: 'Tecnologia', pattern: /\b(consumer electronics|phones|telecommunications|computers|computer|tablets|audio|video|mobile phones|electronic components|security protection)\b/ },
  { category: 'Casa e cozinha', pattern: /\b(home|garden|home improvement|kitchen|household|furniture|lighting|bathroom|tools|hardware)\b/ },
  { category: 'Esporte e lazer', pattern: /\b(sports|outdoors|cycling|fitness|camping|fishing|sports entertainment)\b/ }
];

const RULES = [
  { category: 'Auto, Moto & Peças', subcategories: [
    ['Peças e componentes de automóveis', /\b(pecas automotivas|peca automotiva|pecas para carro|peca para carro|motor automotivo|kit embreagem|embreagem automotiva|cambio automotivo|transmissao automotiva|suspensao automotiva|amortecedor(?:es)?(?: automotivo(?:s)?)?|pastilha(?:s)? de freio|disco(?:s)? de freio|filtro de oleo|filtro de ar automotivo|filtro de combustivel|vela(?:s)? de ignicao|correia dentada|rolamento automotivo|radiador automotivo|bomba de combustivel|bomba d agua automotiva|escapamento automotivo|sonda lambda|junta de motor|alternador automotivo|motor de partida|bobina de ignicao)\b/],
    ['Acessórios automotivos e conforto', /\b(acessorios automotivos|acessorio automotivo|capa(?:s)? de banco(?: de)? (?:para )?carro|capa banco carro|tapete(?:s)? automotivo(?:s)?|tapete(?:s)? para carro|organizador(?:es)? automotivo(?:s)?|organizador de porta malas|apoio de braco automotivo|cortina automotiva|protetor solar automotivo|suporte de celular para carro|suporte celular para carro|carregador veicular|tomada veicular|engate para reboque|friso automotivo|calha de chuva automotiva|capa automotiva)\b/],
    ['Som, multimídia e tecnologia automotiva', /\b(central multimidia|multimidia automotiva|multimidia para carro|radio automotivo|som automotivo|alto falante automotivo|alto falante para carro|subwoofer automotivo|modulo amplificador automotivo|camera veicular|camera de re|camera de re automotiva|dash ?cam|sensor de estacionamento|gps automotivo|alarme automotivo|rastreador veicular|interface automotiva)\b/],
    ['Pneus, rodas e ferramentas automotivas', /\b(pneus? (?:aro ?(?:13|14|15|16|17|18|19|20)|para carro|de carro|automotivo|(?:1[5-9][0-9]|2[0-9]{2}) (?:35|40|45|50|55|60|65|70|75|80) r ?(?:13|14|15|16|17|18|19|20|21|22))|rodas? automotivas?|calotas?|camara de ar automotiva|compressor(?: de ar)?(?: portatil)? para pneus?|compressor de pneu|calibrador(?: de pneus?)?|macaco hidraulico|chave de roda|kit reparo de pneus?|remendo para pneu|ferramentas? mecanicas? automotivas?)\b/],
    ['Baterias e sistemas de partida', /\b(baterias? automotivas?|baterias? de carro|baterias? para carro|baterias? de moto|baterias? para moto|baterias? de caminhao|baterias? para caminhao|baterias? de onibus|baterias? para onibus|baterias? de trator|baterias? para trator|baterias? (?:45|50|55|60|65|70|75|80|90|100|120) ?ah|baterias? agm|baterias? efb|bateria start ?stop|baterias? de litio para moto|baterias? seladas? para moto|bateria estacionaria automotiva|carregador de bateria automotiva|carregador de bateria 12v|mantenedor de carga|testador de bateria automotiva|teste de bateria automotiva|auxiliar de partida|jump ?starter|cabos? de transferencia de bateria|terminais? de bateria automotiva|conectores? de bateria automotiva|suporte para bateria automotiva|motor de partida automotivo|alternador automotivo)\b/],
    ['Peças e mecânica de motocicletas', /\b(pecas para moto|pecas de motocicleta|peca para moto|relacao de moto|kit relacao moto|corrente de moto|pinhao de moto|coroa de moto|pastilha de freio moto|disco de freio moto|embreagem de moto|amortecedor de moto|filtro de moto|vela de moto|pneu de moto|bateria de moto|escapamento de moto|carburador de moto|injecao eletronica moto)\b/],
    ['Equipamentos e proteção para motociclistas', /\b(capacete para moto|capacete moto|capacete motociclista|luvas? para motociclista|luvas? de moto|luvas? moto|jaqueta para moto|jaqueta moto|jaqueta motociclista|calca para motociclista|botas? para motociclista|botas? moto|joelheira para moto|protetor de coluna motociclista|oculos motocross|equipamentos? de protecao para motociclista)\b/],
    ['Acessórios e equipamentos para motos', /\b(acessorios para moto|acessorio para moto|bau para moto|bau de moto|bolsa para moto|suporte de celular para moto|suporte celular moto|protetor de carenagem|parabrisa para moto|manopla de moto|retrovisor de moto|farol led moto|alarme para moto|intercomunicador para capacete|slider para moto|pedaleira de moto|protetor de motor moto)\b/],
    ['Limpeza, estética e manutenção automotiva', /\b(limpeza automotiva|estetica automotiva|cera automotiva|polidor automotivo|politriz automotiva|shampoo automotivo|limpa estofado automotivo|limpa painel automotivo|revitalizador de plastico automotivo|pano de microfibra automotivo|aspirador automotivo|lavadora de pressao automotiva|produtos? para detalhamento automotivo)\b/],
    ['Caminhões, ônibus e utilitários', /\b(pecas para caminhao|pecas de caminhao|acessorios para caminhao|pecas para onibus|pecas de onibus|pecas para caminhonete|acessorios para caminhonete|acessorios para pick ?up|engate para reboque|pecas para veiculos pesados|ferramentas para veiculos pesados|iluminacao para caminhao)\b/]
  ]},
  { category: 'Sex shop', subcategories: [
    ['Vibradores e massageadores', /\b(vibrador(?:es)?(?: intimo(?:s)?| recarregavel(?:is)?| sexual(?:is)?| deusa)|vibrador(?:es)?[^,]{0,80}(?:brinquedo|produtos? sexuais?)|massageador(?:es)? intimo(?:s)?|massageador(?:es)?[^,]{0,40}intimo(?:s)?|massageador(?:es)? pessoal(?:is)?|sugador(?:es)? intimo(?:s)?)\b/],
    ['Lubrificantes e géis', /\b(lubrificante(?:s)? intimo(?:s)?|gel intimo|gel lubrificante|lubrificante sexual)\b/],
    ['Preservativos e proteção', /\b(preservativo(?:s)?|camisinha(?:s)?|anel peniano)\b/],
    ['Lingerie sensual', /\b(lingerie sensual|fantasia erotica|fantasia sensual|body sensual|calcinha tailandesa|perolas? massageadoras?|anel massageador)\b/],
    ['Acessórios íntimos', /\b(plug anal|consolo|bolas tailandesas|algema sensual|pompoarismo)\b/],
    ['Bem-estar íntimo', /\b(sex shop|sexshop|produto erotico|estimulador sexual|bem estar intimo|caneta intima)\b/]
  ]},
  { category: 'Pet', subcategories: [['Produtos para pets', /\b(cachorro|cachorros|cao|caes|gato|gatos|pet|pets|racao|coleira|areia sanitaria|brinquedo pet|petisco|pet shop|comedouro|bebedouro pet|fralda pet|tapete higienico pet|manta pet|absorvente pet|xixi pet|banheiro pet|sanitario pet|higiene canina)\b/]] },
  { category: 'Bebês e crianças', subcategories: [['Cuidados infantis', /\b(fralda(?:s)?|bebe|mamadeira|chupeta|carrinho de bebe|cadeirinha.*bebe|infantil|maternidade|brinquedo educativo)\b/]] },
  { category: 'Tecnologia', subcategories: [
    ['Celulares e computadores', /\b(celular|smartphone|iphone|samsung|xiaomi|notebook|computador|tablet|monitor|ssd|memoria ram|teclado|mouse|carregador|power bank|camera de seguranca)\b/],
    ['Áudio e games', /\b(fone|headset|fone de ouvido|playstation|xbox|nintendo|videogame|controle gamer|caixa de som|bluetooth)\b/]
  ]},
  { category: 'Casa e cozinha', subcategories: [
    ['Eletrodomésticos', /\b(air fryer|airfryer|fritadeira|liquidificador|geladeira|fogao|microondas|aspirador|cafeteira|ventilador|purificador|maquina de lavar)\b/],
    ['Casa e organização', /\b(panela|cozinha|movel|cama|mesa|cadeira|organizador|organizadores|decoracao|ferramenta|forma de silicone|utensilio|luminaria|forro de papel)\b/]
  ]},
  { category: 'Moda e beleza', subcategories: [
    ['Moda', /\b(pijama(?:s)?|camisola(?:s)?|roupa de dormir|roupas de dormir|robe|roupao|lingerie|vestido|camisa|calca|tenis|bolsa|sapato|jaqueta|roupa|camiseta|blusa|shorts|relogio|oculos de sol|joia|bijuteria)\b/],
    ['Beleza e cuidados pessoais', /\b(perfume|maquiagem|creme|shampoo|protetor solar|skincare|hidratante|cosmetico|barbeador|secador de cabelo)\b/]
  ]},
  { category: 'Esporte e lazer', subcategories: [['Esporte e atividades', /\b(bicicleta|halter|halteres|academia|yoga|camping|barraca|pesca|bola de futebol|bola esportiva|patins|skate|esteira|colchonete fitness)\b/]] },
  { category: 'Alimentos e bebidas', subcategories: [['Alimentos', /\b(cafe|chocolate|biscoito|azeite|alimento|bebida|cha|suplemento alimentar)\b/]] }
,
  { category: 'Informática e escritório', subcategories: [
    ['Computadores e componentes', /\b(impressora|toner|cartucho|scanner|nobreak|mini pc|all in one|placa de video|processador|placa mae|memoria ram|gabinete pc|fonte pc|cooler pc|water cooler|dock station|monitor ultrawide|mesa digitalizadora)\b/],
    ['Acessórios e escritório', /\b(cadeira escritorio|ergonomica|calculadora|grampeador|furador papel|quadro branco|organizador escritorio|mochila notebook|papel fotografico)\b/]
  ]},
  { category: 'Games e entretenimento', subcategories: [
    ['Consoles e acessórios gamer', /\b(playstation|ps5|xbox|nintendo switch|videogame|controle ps|controle xbox|volante gamer|jogos ps|jogos xbox|jogos nintendo|capturadora de video|oculos realidade virtual)\b/]
  ]},
  { category: 'Jardim e construção', subcategories: [
    ['Ferramentas e construção', /\b(furadeira|parafusadeira|broca|serra circular|serra tico tico|esmerilhadeira|lixadeira|solda inversora|chave impacto|trena|nivel laser|multimetro|escada aluminio|gerador energia|material construcao)\b/],
    ['Jardim e área externa', /\b(mangueira jardim|esguicho jardim|tesoura poda|aparador grama|rocadeira|cortador grama|vaso planta|kit jardinagem|moveis jardim|guarda sol praia|piscina inflavel)\b/]
  ]},
  { category: 'Viagem e acessórios', subcategories: [
    ['Malas e viagem', /\b(mala viagem|mala bordo|mochila viagem|organizador mala|travesseiro viagem|adaptador tomada universal|cadeado mala|balanca mala|necessaire viagem)\b/]
  ]},
  { category: 'Papelaria e artesanato', subcategories: [
    ['Papelaria e material escolar', /\b(caderno|agenda|planner|caneta|kit canetas|lapis de cor|marca texto|estojo escolar|mochila rodinha|papelaria|material escolar|quadro branco)\b/],
    ['Artesanato e festas', /\b(fantasia|acessorios festa|decoracao festa|balao festa|painel festa|topo bolo|lembrancinha|embalagem presente|arvore natal|enfeite natal|artesanato|maquina costura|kit croche|kit trico|tela pintura|tinta acrilica)\b/]
  ]},
  { category: 'Fotografia e drones', subcategories: [
    ['Câmeras e acessórios', /\b(camera digital|camera profissional|lente camera|drone|action camera|camera instantanea|cartao sd|bateria camera|flash camera|binoculo|gimbal)\b/]
  ]},
  { category: 'Segurança e automação', subcategories: [
    ['Casa inteligente e segurança', /\b(camera wifi|camera seguranca|video porteiro|interfone|alarme residencial|fechadura eletronica|olho magico digital|sensor movimento|roteador mesh|repetidor sinal|switch rede|adaptador wifi|smart home|assistente virtual|tomada wifi|interruptor inteligente|fita led|lampada led)\b/]
  ]}
];

const PROVIDER_NAMES = new Set(['shopee', 'aliexpress', 'amazon', 'lomadee', 'awin', 'admitad', 'rakuten', 'magalu', 'temu', 'mercado livre', 'mercadolivre']);

export function classifyProduct(input = {}) {
  const title = normalize(input.title ?? input.name ?? '');
  const description = normalize(input.description ?? '');
  const sourceCategory = normalize(input.sourceCategory ?? input.source_category ?? input.category ?? '');
  const text = [title, description].filter(Boolean).join(' ');

  for (const rule of RULES) {
    for (const [subcategory, pattern] of rule.subcategories) {
      if (pattern.test(text)) return {
        category: rule.category, subcategory,
        tags: [normalize(rule.category).replace(/\s+/g, '-'), normalize(subcategory).replace(/\s+/g, '-')],
        confidence: sourceCategory && !PROVIDER_NAMES.has(sourceCategory) ? 0.94 : 0.86,
        needsReview: false, reason: 'keyword_match'
      };
    }
  }

  if (sourceCategory && !PROVIDER_NAMES.has(sourceCategory)) {
    for (const rule of SOURCE_RULES) if (rule.pattern.test(sourceCategory)) {
      return {
        category: rule.category, subcategory: 'Categoria da API de origem',
        tags: [normalize(rule.category).replace(/\s+/g, '-')],
        confidence: 0.92, needsReview: false, reason: 'source_category_match'
      };
    }
  }

  return { category: 'Ofertas gerais', subcategory: 'A classificar', tags: ['ofertas-gerais'], confidence: 0.25, needsReview: true, reason: 'no_reliable_match' };
}

export function categoryHint(title, source = '') { return classifyProduct({ title, sourceCategory: source }).category; }
export const CATEGORY_RULES_VERSION = '1.3.0';