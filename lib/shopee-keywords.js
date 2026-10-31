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
  'café em grãos','cafeteira cápsula','moedor de café','chocolate','air fryer acessórios','temperos','kit churrasco','panela wok','marmita térmica','balança cozinha',
  "impressora","impressora tanque de tinta","impressora laser","toner","cartucho de tinta","papel fotográfico","scanner","nobreak","estabilizador","mini pc","computador all in one","placa de vídeo","processador","placa mãe","memória ram","gabinete pc","fonte pc","cooler pc","water cooler","ventoinha pc","dock station","monitor ultrawide","monitor portátil","mesa digitalizadora","console playstation","playstation 5","xbox series","nintendo switch","jogos ps5","jogos xbox","jogos nintendo","controle ps5","controle xbox","volante gamer","cadeira escritório","microfone gamer","ring light","tripé celular","estabilizador celular","capturadora de vídeo","óculos realidade virtual","smart tv","televisão 32 polegadas","televisão 43 polegadas","televisão 50 polegadas","televisão 55 polegadas","televisão 65 polegadas","suporte tv","antena digital","conversor digital","home theater","blu ray","cabo hdmi","cabo displayport","controle remoto universal","cooktop indução","fogão","forno de embutir","forno elétrico air fryer","panela de arroz","panela de pressão elétrica","panela de pressão inox","panela antiaderente","frigideira","wok","chaleira elétrica","sanduicheira","grill elétrico","torradeira","máquina de pão","máquina de café","máquina de gelo","adega climatizada","cervejeira","bebedouro","máquina de lavar louça","lava louças","secadora","centrífuga roupas","ferro a vapor","passadeira a vapor","robô limpa vidro","mop","aspirador vertical","aspirador robô","extratora limpeza","lavadora portátil","purificador de ar","climatizador","ar condicionado portátil","aquecedor elétrico","lareira elétrica","colchão inflável","ventilador de teto","ventilador torre","exaustor","coifa","depurador","filtro purificador","sofá","poltrona","mesa jantar","mesa dobrável","mesa lateral","mesa centro","cadeira jantar","cadeira gamer","banqueta","cômoda","guarda roupa casal","guarda roupa solteiro","painel ripado","prateleira","nicho parede","estante livros","sapateira vertical","criado mudo","cabeceira cama","base cama box","cama casal","cama solteiro","beliche","bicama","colchão casal","colchão solteiro","protetor colchão","roupa de cama","lençol","fronha","manta","almofada","persiana","papel de parede","adesivo parede","quadro decorativo","vaso decorativo","planta artificial","organizador guarda roupa","organizador gaveta","cabide","cesto roupa","lixeira automática","dispenser sabonete","jogo americano","escorredor louça","peneira","ralador","triturador alimentos","processador alimentos","batedor mixer","mixer portátil","faca cozinha","kit facas","tábua corte","assadeira","forma bolo","forma silicone","panela cerâmica","pote vidro","pote plástico","garrafa água","squeeze","caneca","taça","travessa","jogo sobremesa","kit utensílios cozinha","porta temperos","moedor temperos","balança digital cozinha","termômetro culinário","organizador geladeira","câmera digital","câmera profissional","lente câmera","drone","drone câmera","gimbal","action camera","câmera instantânea","cartão sd","bateria câmera","flash câmera","binóculo","iphone 16","iphone 15","iphone 14","samsung galaxy s","samsung galaxy a","xiaomi redmi note","motorola moto g","celular 5g","celular 256gb","celular 128gb","celular 8gb ram","celular 12gb ram","tablet infantil","tablet samsung","tablet lenovo","caneta tablet","capa tablet","película celular","capa celular","carregador magsafe","carregador sem fio","cabo lightning","cabo usb c","fone tws","fone com cancelamento ruído","short feminino","short masculino","bermuda masculina","bermuda feminina","calça masculina","calça feminina","calça cargo","calça social","blusa feminina","blusa masculina","cropped","top feminino","body feminino","saia","macacão","conjunto masculino","conjunto infantil","roupa bebê","body bebê","macacão bebê","vestido infantil","fantasia infantil","uniforme escolar","uniforme profissional","meia calça","meia esportiva","pochete","bolsa transversal","bolsa mochila","mala bordo","mala grande","necessaire","carteira feminina","cinto","gravata","relógio feminino","óculos grau","armação óculos","boné masculino","chapéu","luva inverno","cachecol","pijama infantil","pijama feminino","pijama masculino","roupa íntima","sutiã","calcinha","biquíni","maiô","saída de praia","roupa praia","base maquiagem","corretivo","pó compacto","blush","iluminador","delineador","máscara cílios","gloss labial","kit maquiagem","pincel maquiagem","esponja maquiagem","removedor maquiagem","água micelar","protetor térmico cabelo","óleo capilar","leave in","máscara facial","esfoliante facial","sabonete facial","gel limpeza facial","vitamina c cosmético","creme anti idade","creme mãos","creme pés","desodorante","kit perfume","perfume importado","colônia","aparador barba","depilador elétrico","escova elétrica","escova cabelo","secador profissional","prancha cabelo","babyliss","fralda geriátrica","fralda descartável","absorvente","protetor diário","lenço umedecido adulto","bolsa maternidade","trocador portátil","cadeira alimentação bebê","cercado bebê","andador bebê","tapete atividades bebê","móbile berço","babá eletrônica","monitor bebê","cadeirinha alimentação","assento infantil","brinquedo montessori","brinquedo madeira","massinha modelar","lego","blocos construção","jogo tabuleiro","quebra cabeça adulto","pelúcia","patinete infantil","bicicleta infantil","patins infantil","skate infantil","piscina de bolinhas","ração premium cachorro","ração premium gato","petisco cachorro","petisco gato","areia sílica gato","fonte água pet","tapete gelado pet","roupa cachorro","roupa gato","casinha cachorro","casinha gato","grade proteção pet","portão pet","shampoo pet","escova pet","máquina tosa pet","cortador unha pet","caixa areia gato","pá areia gato","bebedouro automático pet","comedouro automático pet","cinto segurança pet","capa banco pet","arranhador grande","furadeira impacto","parafusadeira bateria","kit brocas","broca concreto","serra circular","serra tico tico","esmerilhadeira","lixadeira","solda inversora","compressor portátil","pistola pintura","chave impacto","jogo ferramentas profissional","alicate","chave inglesa","chave torque","trena","nível laser","detector tensão","multímetro","escada alumínio","organizador ferramentas","bancada ferramentas","gerador energia","pneu carro","pneu moto","óleo motor","capacete moto","luva motociclista","jaqueta moto","capa chuva moto","baú moto","suporte gps moto","câmera ré","sensor estacionamento","multimídia carro","rádio automotivo","som automotivo","alto falante carro","subwoofer","tapete carro","capa banco carro","compressor pneu","macaco hidráulico","carregador bateria carro","aspirador carro","lavadora carro","cera automotiva","politriz","ferramenta automotiva","bicicleta aro 29","bicicleta elétrica","capacete ciclismo","luva ciclismo","farol bicicleta","acessórios bicicleta","esteira elétrica","elíptico","estação musculação","halter ajustável","anilha","barra musculação","banco supino","corda pular","luva boxe","saco pancada","bola basquete","bola futsal","chuteira","camisa futebol","raquete beach tennis","raquete padel","rede vôlei","barraca  camping","saco dormir","colchão camping","fogareiro camping","mochila trilha","lanterna camping","caixa térmica","cadeira dobrável","guarda sol praia","prancha surf","óculos natação","maiô natação","mala viagem","mochila viagem","mochila notebook","bolsa térmica","organizador mala","travesseiro viagem","adaptador tomada universal","cadeado mala","balança mala","necessaire viagem","carteira viagem","café moído","cápsula café","cafeteira expresso","chá","chá orgânico","chocolate caixa","bombom","biscoito","snack","castanhas","azeite","temperos naturais","kit temperos","pote mantimento","garrafa térmica inox","kit churrasco","acessórios churrasco","tábua churrasco","faca churrasco","moedor carne","máquina macarrão","material escolar","caderno","caderno inteligente","agenda","planner","caneta","kit canetas","lápis de cor","marca texto","estojo escolar","mochila rodinha","mochila infantil","papelaria","calculadora","grampeador","furador papel","organizador escritório","quadro branco","cadeira escritório ergonômica","iluminação led","fita led","lâmpada led","luminária mesa","luminária teto","lustre","pendente","spot led","refletor led","sensor movimento","fechadura eletrônica","olho mágico digital","alarme residencial","interfone","video porteiro","roteador mesh","repetidor sinal","switch rede","cabo rede","adaptador wifi","smart home","assistente virtual","tomada wifi","interruptor inteligente","material construção","torneira cozinha","torneira banheiro","chuveiro elétrico","ducha higiênica","assento sanitário","kit banheiro","box banheiro","prateleira banheiro","espelho banheiro","varal teto","varal retrátil","mangueira jardim","esguicho jardim","tesoura poda","aparador grama","roçadeira","cortador grama","lavadora pressão","móveis jardim","vaso planta","kit jardinagem","fantasia","acessórios festa","decoração festa","balão festa","painel festa","topo bolo","lembrancinha","embalagem presente","papel presente","árvore natal","enfeite natal","pisca pisca","decoração páscoa","artesanato","máquina costura","tecido","linha costura","kit crochê","kit tricô","material pintura","tela pintura","tinta acrílica","pincel pintura"
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

const KEYWORD_FAMILIES = [
  ['baby', /\b(bebe|fralda|mamadeira|chupeta|carrinho de bebe|infantil|brinquedo|boneca|mochila escolar|estojo|lancheira)\b/],
  ['technology', /\b(smartphone|celular|iphone|tablet|ipad|notebook|laptop|computador|monitor|teclado|mouse|headset|fone|ssd|hd externo|pendrive|roteador|power bank|carregador|televisao|tv 4k|projetor|camera|smartwatch|chromecast|webcam|microfone)\b/],
  ['beauty', /\b(perfume|body splash|hidratante|protetor solar|skincare|serum|creme facial|shampoo|condicionador|secador|chapinha|maquiagem|batom|barbeador)\b/],
  ['home', /\b(air fryer|airfryer|cafeteira|liquidificador|batedeira|panela|geladeira|freezer|ventilador|aspirador|purificador|micro ondas|forno eletrico|guarda roupa|armario|sapateira|colchao|travesseiro|jogo de cama|edredom|cortina|tapete|luminaria|organizador|torneira|chuveiro|lixeira)\b/],
  ['fashion', /\b(tenis|sapato|sandalia|chinelo|bota|moletom|jaqueta|casaco|camiseta|calca jeans|legging|roupa fitness|conjunto feminino|vestido|bolsa|mochila feminina|carteira|relogio masculino|oculos de sol|bone|cueca|lingerie|pijama|camisola|meia)\b/],
  ['pet', /\b(racao|cachorro|gato|areia para gato|comedouro pet|bebedouro pet|cama pet|coleira|guia para cachorro|brinquedo pet|arranhador)\b/],
  ['sports', /\b(halter|musculacao|esteira|bicicleta ergonomica|colchonete|yoga|elastico treino|bola futebol|bola volei|raquete|luva academia)\b/],
  ['tools-auto', /\b(furadeira|parafusadeira|ferramentas|serra eletrica|lavadora de alta pressao|compressor|escada|trena|lanterna|bateria automotiva|aspirador automotivo|suporte celular carro|camera veicular|capacete|pneu bicicleta|patinete|mala de viagem|barraca camping|churrasqueira)\b/],
  ['food', /\b(cafe em graos|moedor de cafe|chocolate|temperos|marmita termica|balanca cozinha)\b/]
];

export function getShopeeKeywordFamily(keyword) {
  const normalized = normalize(keyword);
  return KEYWORD_FAMILIES.find(([, pattern]) => pattern.test(normalized))?.[0] || 'other';
}

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
  return [...new Map([...values].filter(Boolean).map(value => [normalize(value), value])).values()];
}

const KEYWORDS = buildShopeeKeywordCatalog();

export function selectShopeeKeywords(slot, limit = 3) {
  const count = Math.max(0, Math.min(12, Math.floor(Number(limit) || 0)));
  if (!count || !KEYWORDS.length) return [];
  const normalizedSlot = Math.abs(Math.floor(Number(slot) || 0));
  const start = (normalizedSlot * 7) % KEYWORDS.length;
  const stride = 7919;
  const selected = [];
  const fallback = [];
  const seen = new Set();
  const selectedFamilies = new Set();
  for (let i = 0; selected.length < count && i < KEYWORDS.length * 2; i++) {
    const keyword = KEYWORDS[(start + i * stride) % KEYWORDS.length];
    const key = normalize(keyword);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const family = getShopeeKeywordFamily(keyword);
    if (!selectedFamilies.has(family) && family !== 'other') {
      selected.push(keyword);
      selectedFamilies.add(family);
    } else {
      fallback.push(keyword);
    }
  }
  for (const keyword of fallback) {
    if (selected.length >= count) break;
    selected.push(keyword);
  }
  return selected;
}

export function getShopeeKeywordQualityPenalty(title, keyword) {
  const normalizedTitle = normalize(title);
  const normalizedKeyword = normalize(keyword);
  if (!normalizedTitle || !normalizedKeyword) return 0;
  const accessory = /suporte|capa|capinha|pelicula|cartao de memoria|cabo usb|carregador|adaptador|case|adesivo|formas? de silicone|papel descartavel|cesto silicone|reparo|reposicao/.test(normalizedTitle);
  if (!accessory) return 0;
  if (/smartphone|celular|iphone|tablet|ipad/.test(normalizedKeyword)) return -18;
  if (/air fryer|airfryer|fritadeira/.test(normalizedKeyword)) return -25;
  return 0;
}

export const shopeeKeywordCatalogSize = KEYWORDS.length;
