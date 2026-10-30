const PRODUCT_TERMS = [
  'air fryer','cafeteira','liquidificador','batedeira','fritadeira elétrica','panela elétrica','panela de pressão','micro-ondas','forno elétrico','cooktop','geladeira','freezer','purificador de água','filtro de água','ventilador','circulador de ar','ar condicionado','umidificador','desumidificador','aspirador de pó','robô aspirador','ferro de passar','vaporizador de roupas','máquina de lavar','secadora de roupas',
  'smartphone','celular','iphone','tablet','ipad','notebook computador','notebook gamer','notebook intel i5','notebook intel i7','notebook ryzen','notebook 16gb ram','notebook 8gb ram','notebook ssd','laptop gamer','chromebook','computador gamer','monitor','monitor gamer','teclado mecânico','mouse gamer','mouse sem fio','headset gamer','fone bluetooth','fone sem fio','caixa de som bluetooth','soundbar','microfone usb','webcam','ssd','hd externo','pendrive','cartão de memória','roteador wifi','repetidor wifi','mesh wifi','power bank','carregador rápido','cabo usb c','hub usb','adaptador usb','smartwatch','relógio inteligente','pulseira inteligente','controle bluetooth','console videogame','cadeira gamer','suporte monitor',
  'televisão smart','tv 4k','projetor','chromecast','tv box','câmera de segurança','câmera wifi','campainha inteligente','lâmpada inteligente','tomada inteligente','fechadura digital','sensor presença',
  'fralda bebê','lenço umedecido','mamadeira','chupeta','cadeirinha de carro','carrinho de bebê','bebê conforto','berço portátil','banheira bebê','mochila maternidade','extrator de leite','brinquedo educativo','blocos de montar','boneca','carrinho brinquedo','pista de carrinho','quebra cabeça','jogo infantil','material escolar','mochila escolar','estojo escolar','lancheira',
  'tênis masculino','tênis feminino','tênis corrida','sapato social','sandália feminina','chinelo','bota feminina','bota masculina','moletom','jaqueta','casaco','camiseta masculina','camiseta feminina','calça jeans','legging','roupa fitness','conjunto feminino','vestido','bolsa feminina','mochila feminina','carteira masculina','relógio masculino','óculos de sol','boné','cueca','lingerie','pijama','meia',
  'perfume feminino','perfume masculino','body splash','hidratante corporal','protetor solar','skincare','sérum facial','creme facial','máscara capilar','shampoo','condicionador','secador de cabelo','chapinha','modelador de cachos','barbeador elétrico','máquina de cortar cabelo','escova secadora','maquiagem','base facial','batom','paleta de sombras','unhas postiças',
  'guarda roupa','armário multiuso','sapateira','estante','rack para tv','painel para tv','mesa de escritório','cadeira de escritório','mesa gamer','colchão','travesseiro','jogo de cama','edredom','cobertor','cortina','tapete','espelho','luminária','abajur','organizador de cozinha','organizador de banheiro','pote hermético','garrafa térmica','copo térmico','jogo de panelas','faqueiro','jogo de pratos','talheres','torneira','chuveiro','lixeira','varal','caixa organizadora',
  'furadeira','parafusadeira','kit ferramentas','jogo de chaves','serra elétrica','lavadora de alta pressão','compressor de ar','escada doméstica','trena laser','lanterna','bateria automotiva','aspirador automotivo','suporte celular carro','câmera veicular','carregador veicular','capacete','pneu bicicleta','bicicleta','patinete elétrico','mala de viagem','cadeado','barraca camping','mochila camping','cadeira de praia','cooler','churrasqueira','piscina inflável',
  'halteres','kit musculação','esteira ergométrica','bicicleta ergométrica','colchonete','tapete yoga','elástico treino','bola futebol','bola vôlei','raquete de tênis','luva academia','garrafa academia',
  'ração cachorro','ração gato','areia para gato','comedouro pet','bebedouro pet','cama pet','coleira cachorro','guia para cachorro','brinquedo pet','caixa transporte pet','arranhador gato','tapete higiênico',
  'café em grãos','cafeteira cápsula','moedor de café','chocolate','air fryer acessórios','temperos','kit churrasco','panela wok','marmita térmica','balança cozinha'
];

const BRAND_PRODUCT_GROUPS = [
  { brands: ['Samsung','Apple','Motorola','Xiaomi','Redmi','POCO','Realme'], products: ['smartphone','celular','iphone','tablet','smartwatch','fone bluetooth','power bank','carregador rápido','câmera wifi','roteador wifi'] },
  { brands: ['Lenovo','Acer','ASUS','Dell','HP'], products: ['notebook computador','notebook gamer','notebook intel i5','notebook intel i7','notebook ryzen','notebook 16gb ram','notebook ssd','laptop gamer','chromebook','monitor','monitor gamer','teclado mecânico','mouse gamer','ssd'] },
  { brands: ['Logitech','HyperX','Razer','Corsair','Kingston','Sandisk'], products: ['teclado mecânico','mouse gamer','headset gamer','mouse sem fio','ssd','hd externo','pendrive','cartão de memória','webcam','microfone usb'] },
  { brands: ['JBL','Philips','Xiaomi','Samsung'], products: ['fone bluetooth','caixa de som bluetooth','soundbar','headset gamer','microfone usb','smartwatch'] },
  { brands: ['Philips','Mondial','Britânia','Electrolux','Arno','Oster','Philco','Midea','Consul','Brastemp','WAP','Tramontina'], products: ['air fryer','cafeteira','liquidificador','batedeira','fritadeira elétrica','panela elétrica','panela de pressão','micro-ondas','forno elétrico','aspirador de pó','ventilador','purificador de água','ferro de passar','vaporizador de roupas','secador de cabelo','escova secadora','lavadora de alta pressão','jogo de panelas'] },
  { brands: ['Pantene','L’Oréal','Nivea','CeraVe','La Roche','Eudora','Natura','O Boticário','Taiff','Gama','Wahl'], products: ['perfume feminino','perfume masculino','body splash','hidratante corporal','protetor solar','skincare','sérum facial','creme facial','máscara capilar','shampoo','condicionador','secador de cabelo','chapinha','barbeador elétrico','máquina de cortar cabelo'] },
  { brands: ['Nike','Adidas','Puma','Olympikus','New Balance','Mizuno','Fila','Vizzano','Moleca','Havaianas','Melissa','Lupo','Calvin Klein'], products: ['tênis masculino','tênis feminino','tênis corrida','sandália feminina','chinelo','bota feminina','moletom','jaqueta','camiseta masculina','camiseta feminina','calça jeans','legging','roupa fitness','conjunto feminino','vestido','bolsa feminina','carteira masculina','relógio masculino','cueca','lingerie','pijama','meia'] },
  { brands: ['Fisher Price','Chicco','Graco','Pampers','Huggies'], products: ['fralda bebê','lenço umedecido','mamadeira','chupeta','cadeirinha de carro','carrinho de bebê','bebê conforto','berço portátil','banheira bebê','mochila maternidade','brinquedo educativo'] },
  { brands: ['Lego','Tilibra','Faber-Castell'], products: ['brinquedo educativo','blocos de montar','boneca','carrinho brinquedo','quebra cabeça','jogo infantil','material escolar','mochila escolar','estojo escolar','lancheira'] },
  { brands: ['Petlove','Brit Care'], products: ['ração cachorro','ração gato','areia para gato','comedouro pet','bebedouro pet','cama pet','coleira cachorro','guia para cachorro','brinquedo pet','caixa transporte pet','arranhador gato'] },
  { brands: ['Nespresso','Stanley'], products: ['cafeteira','cafeteira cápsula','moedor de café','café em grãos','copo térmico','garrafa térmica','caneca térmica','marmita térmica'] },
  { brands: ['Tramontina','WAP','Stanley','Bosch','Makita'], products: ['furadeira','parafusadeira','kit ferramentas','jogo de chaves','serra elétrica','lavadora de alta pressão','compressor de ar','trena laser','lanterna','acessórios automotivos','suporte celular carro','câmera veicular'] }
];

const INTENTS = [
  'oferta','promoção','desconto','mais vendido','bom e barato','custo benefício','preço baixo','liquidação',
  'cupom','oferta relâmpago','achadinho','imperdível','kit promocional','lançamento','top vendas','super oferta'
];

const QUALIFIERS = [
  'original','recarregável','sem fio','profissional','compacto','portátil','premium','econômico',
  'para casa','para cozinha','para escritório','para gamer','para bebê','para viagem','2026','kit'
];

const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();

const SYNONYM_GROUPS = [
  ['notebook','laptop','chromebook','ultrabook'],
  ['smartphone','celular','iphone','galaxy','redmi','poco','moto g'],
  ['air fryer','airfryer','fritadeira'],
  ['fone bluetooth','fone','earbud','headset','headphone'],
  ['smartwatch','relogio inteligente','smart band'],
  ['tablet','ipad','redmi pad','galaxy tab'],
  ['ssd','solid state']
];

export function isRelevantShopeeProduct(title, keyword) {
  const normalizedTitle = normalize(title);
  const normalizedKeyword = normalize(keyword);
  if (!normalizedTitle || !normalizedKeyword) return false;
  const group = SYNONYM_GROUPS.find(items => items.some(item => normalizedKeyword === item || normalizedKeyword.startsWith(item + ' ')));
  if (!group) {
    const tokens = normalizedKeyword.split(' ').filter(token => token.length > 2);
    return tokens.length ? tokens.every(token => normalizedTitle.includes(token)) : normalizedTitle.includes(normalizedKeyword);
  }
  const matchedAlias = group.some(alias => normalizedTitle.includes(alias));
  if (!matchedAlias) return false;
  if (group[0] === 'notebook' && /educativo|infantil|brinquedo|gabinete|placa mae|teclado|mouse|adaptador|suporte|adesivo|papel|etiqueta/.test(normalizedTitle)) return false;
  const specialTokens = group.flatMap(alias => alias.split(' '));
  const extraTokens = normalizedKeyword.split(' ').filter(token => token.length > 2 && !specialTokens.includes(token));
  return extraTokens.every(token => normalizedTitle.includes(token));
}


export function buildShopeeKeywordCatalog() {
  const values = new Set(PRODUCT_TERMS);
  for (const product of PRODUCT_TERMS) {
    for (const intent of INTENTS) values.add(intent + ' ' + product);
    for (const qualifier of QUALIFIERS) values.add(product + ' ' + qualifier);
  }
  for (const group of BRAND_PRODUCT_GROUPS) {
    for (const brand of group.brands) for (const product of group.products) values.add(brand + ' ' + product);
  }
  return [...values].filter(Boolean);
}

const KEYWORDS = buildShopeeKeywordCatalog();

export function selectShopeeKeywords(slot, limit = 3) {
  const count = Math.max(0, Math.min(12, Math.floor(Number(limit) || 0)));
  if (!count || !KEYWORDS.length) return [];
  const normalizedSlot = Math.abs(Math.floor(Number(slot) || 0));
  const start = (normalizedSlot * 7) % KEYWORDS.length;
  const stride = 7919;
  const selected = [];
  const seen = new Set();
  for (let i = 0; selected.length < count && i < KEYWORDS.length * 2; i++) {
    const keyword = KEYWORDS[(start + i * stride) % KEYWORDS.length];
    const key = normalize(keyword);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    selected.push(keyword);
  }
  return selected;
}

export function getShopeeKeywordQualityPenalty(title, keyword) {
  const normalizedTitle = normalize(title);
  const normalizedKeyword = normalize(keyword);
  if (!normalizedTitle || !normalizedKeyword) return 0;
  const accessory = /suporte|capa|capinha|pelicula|cartao de memoria|cabo usb|carregador|adaptador|case|adesivo|forma de silicone|papel descartavel|cesto silicone|reparo|reposicao/.test(normalizedTitle);
  if (!accessory) return 0;
  if (/smartphone|celular|iphone|tablet|ipad/.test(normalizedKeyword)) return -18;
  if (/air fryer|airfryer|fritadeira/.test(normalizedKeyword)) return -25;
  return 0;
}

export const shopeeKeywordCatalogSize = KEYWORDS.length;
