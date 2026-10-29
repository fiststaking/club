/* ══ FIST 生态农场 · 多语言（与主站 index.html 对齐） ══════════════════════════
   语言集合与主站一致：zh / en / hi / ja / ko / es / fr / de / pt，
   共用 localStorage 键 BNIX_lang，主站切换后进入农场页会自动沿用。
   实现方式：React 产物不便改源码，这里在 DOM 层做「源中文 → 目标语言」映射，
   配合 MutationObserver 覆盖后续渲染与动态数字文案。 */
(function () {
  'use strict';

  var LANGS = ['zh', 'en', 'hi', 'ja', 'ko', 'es', 'fr', 'de', 'pt'];
  var NAMES = {
    zh: '中文', en: 'English', hi: 'हिन्दी', ja: '日本語', ko: '한국어',
    es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português'
  };
  var DEFAULT_LANG = 'zh';
  var KEY = 'BNIX_lang';

  var TITLES = [
    'FIST 生态农场 · 链上农场游戏',
    'FIST Eco Farm · On-chain Farm Game',
    'FIST इको फार्म · ऑन-चेन फार्म गेम',
    'FIST エコファーム · オンチェーン農場ゲーム',
    'FIST 에코 팜 · 온체인 팜 게임',
    'FIST Eco Farm · Juego de granja on-chain',
    'FIST Éco-Ferme · Jeu de ferme on-chain',
    'FIST Öko-Farm · On-Chain-Bauernhofspiel',
    'FIST EcoFazenda · Jogo de fazenda on-chain'
  ];

  var DESCS = [
    'FIST 生态农场：基于 BNB Smart Chain 的链上农场游戏协议，猜中 1.95 奖励，支持多代币与团队级差奖励。',
    'FIST Eco Farm: an on-chain farm game protocol on BNB Smart Chain. Guess right for 1.95x rewards, with multi-token support and team differential rewards.',
    'FIST इको फार्म: BNB Smart Chain पर ऑन-चेन फार्म गेम प्रोटोकॉल। सही अनुमान पर 1.95x इनाम, मल्टी-टोकन और टीम डिफरेंशियल इनाम।',
    'FIST エコファーム：BNB Smart Chain 上のオンチェーン農場ゲーム。的中で 1.95 倍報酬、複数トークンとチーム階差報酬に対応。',
    'FIST 에코 팜: BNB Smart Chain 기반 온체인 팜 게임 프로토콜. 정답 시 1.95배 보상, 다중 토큰과 팀 차등 보상 지원.',
    'FIST Eco Farm: protocolo de juego de granja on-chain en BNB Smart Chain. Acierta y gana 1.95x, con múltiples tokens y recompensas por equipo.',
    'FIST Éco-Ferme : protocole de jeu de ferme on-chain sur BNB Smart Chain. Bonne réponse 1.95x, multi-jetons et récompenses d’équipe.',
    'FIST Öko-Farm: On-Chain-Bauernhofspiel-Protokoll auf BNB Smart Chain. Richtig geraten 1.95x, Multi-Token und Team-Staffelbelohnungen.',
    'FIST EcoFazenda: protocolo de jogo de fazenda on-chain na BNB Smart Chain. Acerto 1.95x, multi-token e recompensas por equipe.'
  ];

  var ROWS = [];
  function row(zh, en, hi, ja, ko, es, fr, de, pt) {
    ROWS.push([zh, en, hi, ja, ko, es, fr, de, pt]);
  }

  /* ── 页头 / 钱包 ── */
  row('FIST 生态农场',
    'FIST Eco Farm', 'FIST इको फार्म', 'FIST エコファーム', 'FIST 에코 팜',
    'FIST Eco Farm', 'FIST Éco-Ferme', 'FIST Öko-Farm', 'FIST EcoFazenda');
  row('链上农场游戏 · BSC ',
    'On-chain Farm Game · BSC ', 'ऑन-चेन फार्म गेम · BSC ', 'オンチェーン農場ゲーム · BSC ', '온체인 팜 게임 · BSC ',
    'Juego de granja on-chain · BSC ', 'Jeu de ferme on-chain · BSC ', 'On-Chain-Bauernhofspiel · BSC ', 'Jogo de fazenda on-chain · BSC ');
  row('主网', 'Mainnet', 'मेननेट', 'メインネット', '메인넷', 'Mainnet', 'Mainnet', 'Mainnet', 'Mainnet');
  row('BSC 主网', 'BSC Mainnet', 'BSC मेननेट', 'BSC メインネット', 'BSC 메인넷', 'BSC Mainnet', 'BSC Mainnet', 'BSC Mainnet', 'BSC Mainnet');
  row('网络错误 · 需 ', 'Network error · need ', 'नेटवर्क त्रुटि · चाहिए ', 'ネットワークエラー · 必要 ', '네트워크 오류 · 필요 ', 'Error de red · se necesita ', 'Erreur réseau · requis ', 'Netzwerkfehler · benötigt ', 'Erro de rede · precisa ');
  row('测试网', 'Testnet', 'टेस्टनेट', 'テストネット', '테스트넷', 'Testnet', 'Testnet', 'Testnet', 'Testnet');
  row('连接钱包', 'Connect Wallet', 'वॉलेट कनेक्ट करें', 'ウォレット接続', '지갑 연결', 'Conectar billetera', 'Connecter le portefeuille', 'Wallet verbinden', 'Conectar carteira');
  row('连接钱包开始', 'Connect your wallet to start', 'शुरू करने के लिए वॉलेट कनेक्ट करें', 'ウォレットを接続して開始', '시작하려면 지갑을 연결하세요', 'Conecta tu billetera para empezar', 'Connectez votre portefeuille pour commencer', 'Verbinde deine Wallet, um zu starten', 'Conecte sua carteira para começar');
  row('连接中...', 'Connecting...', 'कनेक्ट हो रहा है...', '接続中...', '연결 중...', 'Conectando...', 'Connexion...', 'Verbinde...', 'Conectando...');

  /* ── 参与游戏卡片 ── */
  row('参与游戏', 'Play Game', 'गेम खेलें', 'ゲームに参加', '게임 참여', 'Jugar', 'Jouer', 'Spielen', 'Jogar');
  row('猜中 1.95 奖励由合约池兑付',
    'Guess right for 1.95x, rewards paid from the contract pool',
    'सही अनुमान पर 1.95x, इनाम कॉन्ट्रैक्ट पूल से',
    '的中で 1.95 倍、報酬はコントラクトプールから',
    '정답 시 1.95배, 보상은 컨트랙트 풀에서',
    'Acierta y gana 1.95x, recompensa desde el pool del contrato',
    'Bonne réponse 1.95x, récompense versée par le pool du contrat',
    'Richtig geraten 1.95x, Belohnung aus dem Vertragspool',
    'Acerto 1.95x, recompensa paga pelo pool do contrato');
  row('游戏代币', 'Game Token', 'गेम टोकन', 'ゲームトークン', '게임 토큰', 'Token de juego', 'Jeton de jeu', 'Spiel-Token', 'Token do jogo');
  row('选择游戏代币', 'Select game token', 'गेम टोकन चुनें', 'ゲームトークンを選択', '게임 토큰 선택', 'Selecciona token de juego', 'Choisir le jeton de jeu', 'Spiel-Token wählen', 'Selecione o token do jogo');
  row('参与数量', 'Amount', 'राशि', '参加数量', '참여 수량', 'Cantidad', 'Montant', 'Betrag', 'Quantidade');
  row('最大', 'MAX', 'अधिकतम', '最大', '최대', 'MÁX', 'MAX', 'MAX', 'MÁX');
  row('最小 ', 'Min ', 'न्यूनतम ', '最小 ', '최소 ', 'Mín. ', 'Min. ', 'Min. ', 'Mín. ');
  row('余额', 'Balance', 'बैलेंस', '残高', '잔액', 'Saldo', 'Solde', 'Guthaben', 'Saldo');
  row('选择 一 二', 'Choose One or Two', 'एक या दो चुनें', '一 か 二 を選択', '하나 또는 둘 선택', 'Elige Uno o Dos', 'Choisir Un ou Deux', 'Eins oder Zwei wählen', 'Escolha Um ou Dois');
  row('一', 'One', 'एक', '一', '하나', 'Uno', 'Un', 'Eins', 'Um');
  row('二', 'Two', 'दो', '二', '둘', 'Dos', 'Deux', 'Zwei', 'Dois');
  row('结果奇数为对', 'Odd result wins', 'विषम परिणाम जीतेगा', '奇数で当たり', '홀수면 정답', 'Resultado impar acierta', 'Résultat impair gagnant', 'Ungerade gewinnt', 'Resultado ímpar acerta');
  row('结果偶数为对', 'Even result wins', 'सम परिणाम जीतेगा', '偶数で当たり', '짝수면 정답', 'Resultado par acierta', 'Résultat pair gagnant', 'Gerade gewinnt', 'Resultado par acerta');
  row('实际入池（扣转账税）',
    'Net staked (after transfer tax)', 'शुद्ध जमा (ट्रांसफर टैक्स के बाद)', '実入池（送金税控除後）', '실제 입금(전송세 차감)',
    'Aportado neto (tras impuesto)', 'Mise nette (après taxe)', 'Netto-Einsatz (nach Transfersteuer)', 'Valor líquido (após taxa)');
  row('猜中可得（含奖励）',
    'Payout if correct (incl. reward)', 'सही पर भुगतान (इनाम सहित)', '的中時の受取（報酬込み）', '정답 시 수령(보상 포함)',
    'Cobro si aciertas (con recompensa)', 'Gain si correct (récompense incluse)', 'Auszahlung bei Treffer (inkl. Belohnung)', 'Recebimento se acertar (com recompensa)');
  row('净收益', 'Net profit', 'शुद्ध लाभ', '純利益', '순이익', 'Beneficio neto', 'Gain net', 'Nettogewinn', 'Lucro líquido');
  row('有效奖励', 'Effective reward', 'प्रभावी इनाम', '実効報酬', '실효 보상', 'Recompensa efectiva', 'Récompense effective', 'Effektive Belohnung', 'Recompensa efetiva');
  row('猜中奖励', 'Reward if correct', 'सही पर इनाम', '的中報酬', '정답 보상', 'Recompensa por acierto', 'Récompense si correct', 'Belohnung bei Treffer', 'Recompensa por acerto');
  row('手续费', 'Fee', 'शुल्क', '手数料', '수수료', 'Comisión', 'Frais', 'Gebühr', 'Taxa');
  row('猜错', 'If wrong', 'गलत पर', '外れ', '오답 시', 'Si fallas', 'Si faux', 'Bei Fehler', 'Se errar');
  row('损失全部游戏币', 'Lose all game tokens', 'सभी गेम टोकन खो दें', 'ゲームトークンを全額失う', '게임 토큰 전액 손실', 'Pierdes todos los tokens', 'Perte de tous les jetons', 'Alle Spiel-Token verloren', 'Perde todos os tokens');
  row('参与游戏，猜中按 1.95 奖励结算；揭晓后自动结算，无需你回来操作。 也可以成为农场主承接游戏注单，由自有代币兑付奖励。',
    'Play and get 1.95x when right; it settles automatically after the reveal, no need to come back. You can also become a farm owner, take game entries and pay rewards from your own tokens.',
    'खेलें और सही पर 1.95x पाएं; रिवील के बाद स्वतः सेटल, वापस आने की जरूरत नहीं। आप फार्म ओनर बनकर गेम प्रविष्टियाँ ले सकते हैं और अपने टोकन से इनाम दे सकते हैं।',
    '参加して的中なら 1.95 倍。公開後に自動精算されるため戻る必要はありません。農場主になってゲーム注文を引き受け、自己トークンで報酬を支払うこともできます。',
    '참여하고 정답이면 1.95배. 공개 후 자동 정산되어 다시 올 필요가 없습니다. 농장주가 되어 게임 주문을 받고 자체 토큰으로 보상할 수도 있습니다.',
    'Juega y gana 1.95x si aciertas; liquida automáticamente tras el sorteo, sin volver. También puedes ser granjero, aceptar jugadas y pagar con tus tokens.',
    'Jouez et gagnez 1.95x si vous avez raison ; règlement automatique après la révélation, sans revenir. Vous pouvez aussi devenir fermier et payer avec vos jetons.',
    'Spiele und erhalte 1.95x bei Treffer; Abrechnung automatisch nach der Aufdeckung, kein Zurückkommen nötig. Du kannst auch Farmer werden und mit eigenen Token auszahlen.',
    'Jogue e ganhe 1.95x no acerto; liquida automaticamente após o sorteio, sem precisar voltar. Você também pode ser fazendeiro e pagar com seus tokens.');
  row('参与游戏 一', 'Play One', 'एक खेलें', '一 に参加', '하나 참여', 'Jugar Uno', 'Jouer Un', 'Eins spielen', 'Jogar Um');
  row('参与游戏 二', 'Play Two', 'दो खेलें', '二 に参加', '둘 참여', 'Jugar Dos', 'Jouer Deux', 'Zwei spielen', 'Jogar Dois');
  row('请输入参与数量', 'Enter amount', 'राशि दर्ज करें', '参加数量を入力', '참여 수량 입력', 'Introduce la cantidad', 'Saisissez le montant', 'Betrag eingeben', 'Informe a quantidade');

  /* ── 我的记录 ── */
  row('我的记录', 'My Records', 'मेरे रिकॉर्ड', 'マイ記録', '내 기록', 'Mis registros', 'Mes enregistrements', 'Meine Einträge', 'Meus registros');
  row('暂无记录', 'No records yet', 'अभी कोई रिकॉर्ड नहीं', '記録なし', '기록 없음', 'Sin registros', 'Aucun enregistrement', 'Keine Einträge', 'Nenhum registro');
  row('记录编号保存在本浏览器，代币与结果均在链上。',
    'Record IDs are stored in this browser; tokens and results are on-chain.',
    'रिकॉर्ड आईडी इस ब्राउज़र में; टोकन और परिणाम चेन पर।',
    '記録IDはこのブラウザに保存、トークンと結果はオンチェーン。',
    '기록 ID는 브라우저에 저장되고 토큰과 결과는 온체인입니다.',
    'Los ID se guardan en este navegador; tokens y resultados están on-chain.',
    'Les ID sont stockés dans ce navigateur ; jetons et résultats on-chain.',
    'IDs werden im Browser gespeichert; Token und Ergebnisse on-chain.',
    'Os IDs ficam neste navegador; tokens e resultados on-chain.');
  row('揭晓后自动结算', 'Settles automatically after reveal', 'रिवील के बाद स्वतः सेटल', '公開後に自動精算', '공개 후 자동 정산', 'Liquida tras el sorteo', 'Règlement auto après révélation', 'Automatische Abrechnung nach Aufdeckung', 'Liquida após o sorteio');
  row('等待揭晓', 'Awaiting reveal', 'रिवील की प्रतीक्षा', '公開待ち', '공개 대기', 'Esperando sorteo', 'En attente de révélation', 'Warte auf Aufdeckung', 'Aguardando sorteio');
  row('对', 'Win', 'सही', '当たり', '정답', 'Acierto', 'Gagné', 'Treffer', 'Acerto');
  row('错', 'Lose', 'गलत', '外れ', '오답', 'Fallo', 'Perdu', 'Fehler', 'Erro');
  row('已超窗', 'Window passed', 'समय समाप्त', '期限切れ', '기한 초과', 'Fuera de plazo', 'Délai dépassé', 'Frist abgelaufen', 'Prazo expirado');
  row('可结算', 'Settleable', 'सेटल योग्य', '精算可能', '정산 가능', 'Liquidable', 'Réglable', 'Abrechenbar', 'Liquidável');
  row('已快照 · 可结算', 'Snapshot · settleable', 'स्नैपशॉट · सेटल योग्य', 'スナップショット済 · 精算可能', '스냅샷 · 정산 가능', 'Instantánea · liquidable', 'Instantané · réglable', 'Snapshot · abrechenbar', 'Instantâneo · liquidável');
  row('结果已上链', 'Result on-chain', 'परिणाम चेन पर', '結果オンチェーン', '결과 온체인', 'Resultado on-chain', 'Résultat on-chain', 'Ergebnis on-chain', 'Resultado on-chain');
  row('揭晓哈希', 'Reveal hash', 'रिवील हैश', '公開ハッシュ', '공개 해시', 'Hash del sorteo', 'Hash de révélation', 'Aufdeckungs-Hash', 'Hash do sorteio');
  row('在区块浏览器中查看揭晓区块',
    'View the reveal block in the explorer', 'रिवील ब्लॉक एक्सप्लोरर में देखें', '公開ブロックをエクスプローラーで見る', '공개 블록을 탐색기에서 보기',
    'Ver el bloque del sorteo en el explorador', 'Voir le bloc de révélation dans l’explorateur', 'Aufdeckungsblock im Explorer ansehen', 'Ver o bloco do sorteio no explorador');
  row('揭晓还需 ', 'Reveal in ', 'रिवील में ', '公開まで ', '공개까지 ', 'Sorteo en ', 'Révélation dans ', 'Aufdeckung in ', 'Sorteio em ');
  row(' 块（约 ', ' blocks (~', ' ब्लॉक (लगभग ', ' ブロック（約 ', ' 블록 (약 ', ' bloques (~', ' blocs (~', ' Blöcke (~', ' blocos (~');
  row('）', ')', ')', '）', ')', ')', ')', ')', ')');
  row('截止区块 ', 'Deadline block ', 'अंतिम ब्लॉक ', '締切ブロック ', '마감 블록 ', 'Bloque límite ', 'Bloc limite ', 'Fristblock ', 'Bloco limite ');
  row(' · 已固化', ' · finalized', ' · फाइनल', ' · 確定済', ' · 확정됨', ' · finalizado', ' · figé', ' · fixiert', ' · finalizado');
  row('超过结算窗口，游戏币归农场主',
    'Past the settlement window, tokens go to the farm owner',
    'सेटलमेंट विंडो के बाद टोकन फार्म ओनर को',
    '精算期限を過ぎるとトークンは農場主へ',
    '정산 기한이 지나면 토큰은 농장주에게',
    'Pasada la ventana, los tokens van al granjero',
    'Délai dépassé : les jetons vont au fermier',
    'Nach der Frist gehen die Token an den Farmer',
    'Passado o prazo, os tokens vão ao fazendeiro');
  row('固化哈希', 'Freeze hash', 'हैश फ्रीज़ करें', 'ハッシュ確定', '해시 확정', 'Congelar hash', 'Figer le hash', 'Hash einfrieren', 'Congelar hash');
  row('固化中...', 'Freezing...', 'फ्रीज़ हो रहा है...', '確定中...', '확정 중...', 'Congelando...', 'Gel en cours...', 'Friere ein...', 'Congelando...');
  row('结算', 'Settle', 'सेटल करें', '精算', '정산', 'Liquidar', 'Régler', 'Abrechnen', 'Liquidar');
  row('结算中...', 'Settling...', 'सेटल हो रहा है...', '精算中...', '정산 중...', 'Liquidando...', 'Règlement...', 'Rechne ab...', 'Liquidando...');
  row('固化揭晓哈希，此后该记录永久可结算',
    'Freeze the reveal hash so this record stays settleable forever',
    'रिवील हैश फ्रीज़ करें ताकि यह रिकॉर्ड सदा सेटल हो सके',
    '公開ハッシュを確定すると、この記録は恒久的に精算可能',
    '공개 해시를 확정하면 이 기록은 영구 정산 가능',
    'Congela el hash y el registro será liquidable siempre',
    'Figez le hash : l’enregistrement restera réglable',
    'Hash einfrieren – Eintrag bleibt dauerhaft abrechenbar',
    'Congele o hash: o registro ficará liquidável para sempre');
  row('释放敞口', 'Release exposure', 'एक्सपोज़र छोड़ें', 'エクスポージャー解放', '노출 해제', 'Liberar exposición', 'Libérer l’exposition', 'Exposure freigeben', 'Liberar exposição');
  row('释放农场主敞口（游戏币归农场主）',
    'Release owner exposure (tokens go to the owner)',
    'ओनर एक्सपोज़र छोड़ें (टोकन ओनर को)',
    '農場主エクスポージャー解放（トークンは農場主へ）',
    '농장주 노출 해제(토큰은 농장주에게)',
    'Liberar exposición del granjero (tokens al dueño)',
    'Libérer l’exposition du fermier (jetons au propriétaire)',
    'Farmer-Exposure freigeben (Token an den Eigentümer)',
    'Liberar exposição do fazendeiro (tokens ao dono)');
  row('揭晓后本页会自动结算。若长期离线，请确保运维方运行 keeper，否则超过结算窗口后游戏币归农场主。',
    'This page settles automatically after the reveal. If you stay offline, make sure the operator runs a keeper; otherwise tokens go to the farm owner after the settlement window.',
    'रिवील के बाद यह पेज स्वतः सेटल करेगा। लंबे समय ऑफ़लाइन रहें तो ऑपरेटर का keeper चलना सुनिश्चित करें, वरना विंडो के बाद टोकन फार्म ओनर को जाएंगे।',
    '公開後このページは自動精算します。長期間オフラインの場合、運営の keeper 稼働が必要です。期限を過ぎるとトークンは農場主へ。',
    '공개 후 이 페이지가 자동 정산합니다. 장시간 오프라인이면 운영자의 keeper 실행이 필요하며, 기한이 지나면 토큰은 농장주에게 갑니다.',
    'Esta página liquida automáticamente tras el sorteo. Si estás offline mucho tiempo, el operador debe ejecutar un keeper; si no, los tokens van al granjero.',
    'Cette page règle automatiquement après la révélation. Resté hors ligne, l’opérateur doit lancer un keeper ; sinon les jetons vont au fermier.',
    'Diese Seite rechnet nach der Aufdeckung automatisch ab. Bei langer Offline-Zeit muss der Betreiber einen Keeper laufen lassen, sonst gehen die Token an den Farmer.',
    'Esta página liquida automaticamente após o sorteio. Se ficar offline, o operador deve rodar um keeper; senão os tokens vão ao fazendeiro.');

  /* ── 农场主卡片 ── */
  row('农场主', 'Farm Owner', 'फार्म ओनर', '農場主', '농장주', 'Granjero', 'Fermier', 'Farmer', 'Fazendeiro');
  row('晋升与奖励', 'Ranks & Rewards', 'रैंक और इनाम', '昇格と報酬', '승급과 보상', 'Rangos y recompensas', 'Rangs et récompenses', 'Ränge & Belohnungen', 'Patentes e recompensas');
  row('农场主承接游戏注单，奖励由农场主合约池兑付',
    'The farm owner takes game entries; rewards are paid from the owner’s contract pool',
    'फार्म ओनर गेम प्रविष्टियाँ लेता है; इनाम उसके कॉन्ट्रैक्ट पूल से',
    '農場主がゲーム注文を引き受け、報酬は農場主のコントラクトプールから',
    '농장주가 게임 주문을 받고 보상은 농장주 컨트랙트 풀에서',
    'El granjero acepta jugadas; las recompensas salen de su pool',
    'Le fermier prend les mises ; récompenses depuis son pool',
    'Der Farmer nimmt Spieleinsätze an; Belohnungen aus seinem Pool',
    'O fazendeiro aceita jogadas; recompensas do pool dele');
  row('选择代币', 'Select token', 'टोकन चुनें', 'トークンを選択', '토큰 선택', 'Selecciona token', 'Choisir un jeton', 'Token wählen', 'Selecione o token');
  row('选择农场主代币', 'Select farm-owner token', 'फार्म ओनर टोकन चुनें', '農場主トークンを選択', '농장주 토큰 선택', 'Token del granjero', 'Jeton du fermier', 'Farmer-Token wählen', 'Token do fazendeiro');
  row('农场主地址', 'Farm owner address', 'फार्म ओनर पता', '農場主アドレス', '농장주 주소', 'Dirección del granjero', 'Adresse du fermier', 'Farmer-Adresse', 'Endereço do fazendeiro');
  row('（你）', '(you)', '(आप)', '（あなた）', '(나)', '(tú)', '(vous)', '(du)', '(você)');
  row('状态', 'Status', 'स्थिति', '状態', '상태', 'Estado', 'Statut', 'Status', 'Status');
  row('运营中', 'Active', 'सक्रिय', '稼働中', '운영 중', 'Activo', 'Actif', 'Aktiv', 'Ativo');
  row('已冻结（池低于储备线）',
    'Frozen (pool below reserve line)', 'फ्रीज़ (पूल रिज़र्व रेखा से नीचे)', '凍結（プールが準備線以下）', '동결(풀이 준비선 이하)',
    'Congelado (pool bajo la reserva)', 'Gelé (pool sous la réserve)', 'Eingefroren (Pool unter Reserve)', 'Congelado (pool abaixo da reserva)');
  row('池总额（数量 + 敞口）',
    'Pool total (amount + exposure)', 'पूल कुल (राशि + एक्सपोज़र)', 'プール総額（数量＋エクスポージャー）', '풀 총액(수량 + 노출)',
    'Total del pool (cantidad + exposición)', 'Total du pool (montant + exposition)', 'Pool gesamt (Menge + Exposure)', 'Total do pool (quantidade + exposição)');
  row('农场主权益', 'Owner equity', 'ओनर इक्विटी', '農場主権益', '농장주 지분', 'Capital del granjero', 'Capital du fermier', 'Farmer-Kapital', 'Capital do fazendeiro');
  row('在险敞口', 'Exposure at risk', 'जोखिम में एक्सपोज़र', 'リスク中のエクスポージャー', '위험 노출', 'Exposición en riesgo', 'Exposition à risque', 'Risiko-Exposure', 'Exposição em risco');
  row('冻结储备（不可提取）',
    'Frozen reserve (not withdrawable)', 'फ्रीज़्ड रिज़र्व (निकासी अयोग्य)', '凍結準備（引き出し不可）', '동결 준비금(인출 불가)',
    'Reserva congelada (no retirable)', 'Réserve gelée (non retirable)', 'Eingefrorene Reserve (nicht entnehmbar)', 'Reserva congelada (não sacável)');
  row('可提取', 'Withdrawable', 'निकासी योग्य', '引き出し可能', '인출 가능', 'Retirable', 'Retirable', 'Entnehmbar', 'Sacável');
  row('被游戏占用', 'Locked by games', 'गेम में लॉक', 'ゲームで使用中', '게임에 잠김', 'Bloqueado por partidas', 'Verrouillé par des parties', 'Durch Spiele gebunden', 'Bloqueado por jogos');
  row('暂无农场主', 'No farm owner yet', 'अभी कोई फार्म ओनर नहीं', '農場主なし', '농장주 없음', 'Sin granjero', 'Aucun fermier', 'Noch kein Farmer', 'Sem fazendeiro');
  row('成为该币种第一个农场主后，参与者即可参与游戏。',
    'Become the first farm owner for this token and players can start.',
    'इस टोकन के पहले फार्म ओनर बनें, फिर खिलाड़ी खेल सकते हैं।',
    'このトークン最初の農場主になれば、プレイヤーが参加できます。',
    '이 토큰의 첫 농장주가 되면 참가자가 게임할 수 있습니다.',
    'Conviértete en el primer granjero de este token y los jugadores podrán jugar.',
    'Devenez le premier fermier de ce jeton et les joueurs pourront jouer.',
    'Werde erster Farmer für diesen Token, dann können Spieler mitspielen.',
    'Torne-se o primeiro fazendeiro deste token e os jogadores poderão jogar.');
  row('成为农场主充值', 'Deposit to become farm owner', 'फार्म ओनर बनने के लिए जमा', '農場主になるための入金', '농장주 되기 입금', 'Depósito para ser granjero', 'Dépôt pour devenir fermier', 'Einzahlung als Farmer', 'Depósito para ser fazendeiro');
  row('追加储备', 'Add reserve', 'रिज़र्व जोड़ें', '準備金を追加', '준비금 추가', 'Añadir reserva', 'Ajouter réserve', 'Reserve hinzufügen', 'Adicionar reserva');
  row('已追加储备', 'Reserve added', 'रिज़र्व जोड़ा गया', '準備金を追加しました', '준비금 추가됨', 'Reserva añadida', 'Réserve ajoutée', 'Reserve hinzugefügt', 'Reserva adicionada');
  row('充值金额', 'Deposit amount', 'जमा राशि', '入金額', '입금 수량', 'Importe del depósito', 'Montant du dépôt', 'Einzahlungsbetrag', 'Valor do depósito');
  row('提取金额', 'Withdraw amount', 'निकासी राशि', '出金額', '인출 수량', 'Importe a retirar', 'Montant à retirer', 'Auszahlungsbetrag', 'Valor do saque');
  row('请输入充值金额', 'Enter deposit amount', 'जमा राशि दर्ज करें', '入金額を入力', '입금 수량 입력', 'Introduce el depósito', 'Saisissez le dépôt', 'Einzahlungsbetrag eingeben', 'Informe o depósito');
  row('请输入提取金额', 'Enter withdraw amount', 'निकासी राशि दर्ज करें', '出金額を入力', '인출 수량 입력', 'Introduce el importe', 'Saisissez le montant', 'Auszahlungsbetrag eingeben', 'Informe o valor');
  row('最低成为农场主 ', 'Min. to become farm owner ', 'फार्म ओनर बनने के लिए न्यूनतम ', '農場主になる最低額 ', '농장주 최소 금액 ', 'Mín. para ser granjero ', 'Min. pour devenir fermier ', 'Min. als Farmer ', 'Mín. para ser fazendeiro ');
  row('（税后需达此额）', '(must reach this after tax)', '(टैक्स के बाद इतना होना चाहिए)', '（税引後でこの額が必要）', '(세후 이 금액 필요)', '(tras impuestos debe alcanzar esto)', '(après taxe, ce montant requis)', '(nach Steuer erforderlich)', '(após taxa deve atingir isto)');
  row('税后入池低于最低成为农场主额度，需至少',
    'After tax the pool is below the minimum to become farm owner; need at least',
    'टैक्स के बाद पूल फार्म ओनर बनने के न्यूनतम से कम है; कम से कम चाहिए',
    '税引後の入池が農場主になる最低額未満です。最低',
    '세후 풀이 농장주 최소 금액 미만입니다. 최소',
    'Tras impuestos el pool está por debajo del mínimo; se necesitan al menos',
    'Après taxe, le pool est sous le minimum ; il faut au moins',
    'Nach Steuer liegt der Pool unter dem Minimum; mindestens',
    'Após taxa o pool fica abaixo do mínimo; são necessários ao menos');
  row(' 到账。', ' received.', ' प्राप्त।', ' の着金が必要。', ' 입금 필요.', ' recibidos.', ' reçus.', ' erhalten.', ' recebidos.');
  row('税 ', ' Tax ', ' टैक्स ', ' 税 ', ' 세금 ', ' Impuesto ', ' Taxe ', ' Steuer ', ' Taxa ');
  row('成为农场主（', 'Become farm owner (', 'फार्म ओनर बनें (', '農場主になる（', '농장주 되기 (', 'Ser granjero (', 'Devenir fermier (', 'Farmer werden (', 'Ser fazendeiro (');
  row('已成为农场主，你现在是农场主', 'You are now the farm owner', 'अब आप फार्म ओनर हैं', '農場主になりました', '이제 농장주입니다', 'Ya eres el granjero', 'Vous êtes le fermier', 'Du bist jetzt Farmer', 'Agora você é o fazendeiro');
  row('赎回（提取农场主代币）', 'Redeem (withdraw owner tokens)', 'रिडीम (ओनर टोकन निकासी)', '償還（農場主トークン引出）', '상환(농장주 토큰 인출)', 'Canjear (retirar tokens del dueño)', 'Racheter (retirer les jetons du fermier)', 'Einlösen (Farmer-Token entnehmen)', 'Resgatar (sacar tokens do dono)');
  row('只能赎回未被游戏占用的部分',
    'Only the part not locked by games can be redeemed', 'केवल गेम में लॉक न किया गया हिस्सा रिडीम हो सकता है', 'ゲームで使用中の分は償還できません', '게임에 잠기지 않은 부분만 상환 가능',
    'Solo la parte no bloqueada por partidas', 'Seule la part non verrouillée est rachetable', 'Nur der nicht durch Spiele gebundene Teil', 'Somente a parte não bloqueada por jogos');
  row('可赎回 ', 'Redeemable ', 'रिडीम योग्य ', '償還可能 ', '상환 가능 ', 'Retirable ', 'Rachable ', 'Einlösbar ', 'Resgatável ');
  row('当前没有可赎回的余额：', 'No redeemable balance:', 'अभी कोई रिडीम योग्य बैलेंस नहीं:', '償還可能な残高はありません：', '상환 가능한 잔액이 없습니다:', 'Sin saldo retirable:', 'Aucun solde rachetable :', 'Kein einlösbares Guthaben:', 'Sem saldo resgatável:');
  row('农场主池已全部提出，或尚未充值。',
    'The owner pool is fully withdrawn or not funded yet.', 'ओनर पूल पूरा निकाल लिया गया है या अभी जमा नहीं हुआ।', '農場主プールは全額引き出し済み、または未入金です。', '농장주 풀이 전액 인출되었거나 아직 입금되지 않았습니다.',
    'El pool del granjero está retirado o sin fondos.', 'Le pool du fermier est retiré ou non approvisionné.', 'Der Farmer-Pool ist abgehoben oder nicht eingezahlt.', 'O pool do fazendeiro foi sacado ou não foi abastecido.');
  row('赎回', 'Redeem', 'रिडीम', '償還', '상환', 'Canjear', 'Racheter', 'Einlösen', 'Resgatar');
  row('暂无可赎回余额', 'Nothing to redeem', 'रिडीम करने योग्य कुछ नहीं', '償還可能額なし', '상환 가능 금액 없음', 'Nada que retirar', 'Rien à racheter', 'Nichts einzulösen', 'Nada a resgatar');
  row('已提取', 'Withdrawn', 'निकाला गया', '引き出し済み', '인출됨', 'Retirado', 'Retiré', 'Entnommen', 'Sacado');
  row('处理中...', 'Processing...', 'प्रोसेस हो रहा है...', '処理中...', '처리 중...', 'Procesando...', 'Traitement...', 'Verarbeite...', 'Processando...');
  row('该代币的农场主是 ', 'This token’s farm owner is ', 'इस टोकन के फार्म ओनर हैं ', 'このトークンの農場主は ', '이 토큰의 농장주는 ', 'El granjero de este token es ', 'Le fermier de ce jeton est ', 'Farmer dieses Tokens ist ', 'O fazendeiro deste token é ');
  row('， 只有该地址能赎回代币。你可以直接在上面开一个新农场主池（当前池子无活跃代币时不冲突）。',
    ', and only that address can redeem tokens. You can open a new owner pool above (no conflict while the pool has no active tokens).',
    ', और केवल वही पता टोकन रिडीम कर सकता है। आप ऊपर नया फार्म ओनर पूल खोल सकते हैं (पूल में सक्रिय टोकन न हों तो कोई टकराव नहीं)।',
    '、このアドレスのみトークンを償還できます。上で新しい農場主プールを開けます（有効なトークンがなければ競合しません）。',
    ', 이 주소만 토큰을 상환할 수 있습니다. 위에서 새 농장주 풀을 열 수 있습니다(활성 토큰이 없으면 충돌 없음).',
    ', y solo esa dirección puede canjear tokens. Puedes abrir un nuevo pool arriba (sin conflicto si no hay tokens activos).',
    ', et seule cette adresse peut racheter des jetons. Vous pouvez ouvrir un nouveau pool ci-dessus (sans conflit sans jetons actifs).',
    ', und nur diese Adresse kann Token einlösen. Du kannst oben einen neuen Farmer-Pool eröffnen (kein Konflikt ohne aktive Token).',
    ', e somente esse endereço pode resgatar tokens. Você pode abrir um novo pool acima (sem conflito se não houver tokens ativos).');
  row('农场主以自有代币兑付奖励：参与者猜中时，农场主支付等额代币及奖励，并收取 5% 手续费。 冻结储备为参与数额的 ',
    'The farm owner pays rewards from their own tokens: when a participant is right, the owner pays an equal amount of tokens plus the reward and charges a 5% fee. The frozen reserve is ',
    'फार्म ओनर अपने टोकन से इनाम देता है: सही अनुमान पर ओनर बराबर टोकन और इनाम देता है तथा 5% शुल्क लेता है। फ्रीज़्ड रिज़र्व ',
    '農場主は自己トークンで報酬を支払います。的中時は同額トークン＋報酬を支払い、5% の手数料を徴収します。凍結準備は参加額の ',
    '농장주는 자체 토큰으로 보상합니다. 정답 시 동일 수량 토큰과 보상을 지급하고 5% 수수료를 받습니다. 동결 준비금은 참여 수량의 ',
    'El granjero paga con sus propios tokens: si aciertas, paga una cantidad igual más la recompensa y cobra un 5%. La reserva congelada es ',
    'Le fermier paie avec ses propres jetons : en cas de bonne réponse, il verse un montant égal plus la récompense et prélève 5 %. La réserve gelée est de ',
    'Der Farmer zahlt mit eigenen Token: bei Treffer zahlt er den gleichen Betrag plus Belohnung und nimmt 5 % Gebühr. Die eingefrorene Reserve beträgt ',
    'O fazendeiro paga com os próprios tokens: no acerto, paga quantidade igual mais a recompensa e cobra 5%. A reserva congelada é ');
  row('%，池子低于该线时本农场主冻结，只能赎回或补足。',
    '% of the staked amount; below that line this owner is frozen and can only redeem or top up.',
    '% ; उस रेखा से नीचे होने पर यह ओनर फ्रीज़ हो जाता है और केवल रिडीम या टॉप-अप कर सकता है।',
    '%。この線を下回ると農場主は凍結され、償還か補充のみ可能です。',
    '%. 이 선 아래로 내려가면 농장주가 동결되어 상환 또는 보충만 가능합니다.',
    '% de lo aportado; por debajo de esa línea el granjero se congela y solo puede canjear o reponer.',
    '% de la mise ; sous ce seuil, le fermier est gelé et peut seulement racheter ou compléter.',
    '% des Einsatzes; darunter wird der Farmer eingefroren und kann nur einlösen oder auffüllen.',
    '% do aportado; abaixo dessa linha o fazendeiro é congelado e só pode resgatar ou repor.');
  row('游戏结果由链上揭晓区块决定，合约按实际到账金额记账。请自行评估风险。',
    'Game results are determined by the on-chain reveal block; the contract books the actual received amount. Assess the risk yourself.',
    'गेम परिणाम ऑन-चेन रिवील ब्लॉक से तय होते हैं; कॉन्ट्रैक्ट वास्तविक प्राप्त राशि दर्ज करता है। जोखिम स्वयं आंकें।',
    'ゲーム結果はオンチェーンの公開ブロックで決まり、コントラクトは実際の着金額で記帳します。リスクはご自身で判断ください。',
    '게임 결과는 온체인 공개 블록으로 결정되며, 컨트랙트는 실제 입금액으로 기록합니다. 위험은 직접 판단하세요.',
    'Los resultados los determina el bloque de sorteo on-chain; el contrato registra el importe real recibido. Valora el riesgo.',
    'Les résultats dépendent du bloc de révélation on-chain ; le contrat comptabilise le montant réellement reçu. Évaluez le risque.',
    'Ergebnisse bestimmt der On-Chain-Aufdeckungsblock; der Vertrag bucht den tatsächlich erhaltenen Betrag. Risiko selbst einschätzen.',
    'Os resultados vêm do bloco de sorteio on-chain; o contrato registra o valor realmente recebido. Avalie o risco.');

  /* ── 连接 / 错误 / 杂项 ── */
  row('未配置合约地址：请在 .env 设置 REACT_APP_FARM_GUESS。',
    'Contract address not configured: set REACT_APP_FARM_GUESS in .env.',
    'कॉन्ट्रैक्ट पता सेट नहीं है: .env में REACT_APP_FARM_GUESS सेट करें।',
    'コントラクトアドレス未設定：.env に REACT_APP_FARM_GUESS を設定してください。',
    '컨트랙트 주소가 없습니다: .env에 REACT_APP_FARM_GUESS를 설정하세요.',
    'Dirección del contrato no configurada: define REACT_APP_FARM_GUESS en .env.',
    'Adresse du contrat non configurée : définissez REACT_APP_FARM_GUESS dans .env.',
    'Vertragsadresse fehlt: REACT_APP_FARM_GUESS in .env setzen.',
    'Endereço do contrato não configurado: defina REACT_APP_FARM_GUESS no .env.');
  row('网络不匹配，请切换到正确的 BSC 网络。',
    'Wrong network. Please switch to BSC.', 'नेटवर्क गलत है। कृपया BSC पर स्विच करें।', 'ネットワークが違います。BSC に切り替えてください。', '네트워크가 다릅니다. BSC로 전환하세요.',
    'Red incorrecta. Cambia a BSC.', 'Mauvais réseau. Passez à BSC.', 'Falsches Netzwerk. Bitte zu BSC wechseln.', 'Rede errada. Mude para BSC.');
  row('你的代币与记录都在链上，不受影响。刷新页面即可重试；若持续出现，请稍后再试或换一个 RPC。',
    'Your tokens and records are on-chain and safe. Refresh to retry; if it persists, try again later or switch RPC.',
    'आपके टोकन और रिकॉर्ड चेन पर सुरक्षित हैं। रीफ़्रेश करें; समस्या बनी रहे तो बाद में या दूसरा RPC आज़माएँ।',
    'トークンと記録はオンチェーンで安全です。再読み込みで再試行、続く場合は後でまたは別 RPC をお試しください。',
    '토큰과 기록은 온체인에 안전합니다. 새로고침하거나, 계속되면 나중에 또는 다른 RPC를 사용하세요.',
    'Tus tokens y registros están on-chain y a salvo. Recarga para reintentar; si persiste, prueba más tarde u otro RPC.',
    'Vos jetons et enregistrements sont on-chain. Rechargez ; si cela persiste, réessayez plus tard ou changez de RPC.',
    'Token und Einträge sind on-chain sicher. Neu laden; sonst später erneut oder anderen RPC nutzen.',
    'Seus tokens e registros estão on-chain. Recarregue; se persistir, tente depois ou troque de RPC.');
  row('重试', 'Retry', 'पुनः प्रयास', '再試行', '다시 시도', 'Reintentar', 'Réessayer', 'Erneut', 'Tentar de novo');
  row('界面出错了', 'Something went wrong', 'कुछ गड़बड़ हो गई', 'エラーが発生しました', '문제가 발생했습니다', 'Algo salió mal', 'Une erreur est survenue', 'Etwas ist schiefgelaufen', 'Algo deu errado');
  row('这一部分加载失败：', 'Failed to load this part: ', 'यह हिस्सा लोड नहीं हुआ: ', 'この部分の読み込みに失敗：', '이 부분을 불러오지 못했습니다: ', 'No se pudo cargar esta parte: ', 'Échec du chargement de cette partie : ', 'Dieser Teil konnte nicht geladen werden: ', 'Falha ao carregar esta parte: ');
  row('功能切换', 'Tabs', 'टैब', 'タブ', '탭', 'Pestañas', 'Onglets', 'Tabs', 'Abas');
  row('网络错误 ', 'Network error ', 'नेटवर्क त्रुटि ', 'ネットワークエラー ', '네트워크 오류 ', 'Error de red ', 'Erreur réseau ', 'Netzwerkfehler ', 'Erro de rede ');
  row(' 收 ', ' charges ', ' लेता है ', ' は ', ' 부과 ', ' cobra ', ' prélève ', ' berechnet ', ' cobra ');
  row('% 转账税：入池与奖励均按实际到账净额计算， 转账税由你承担，因此有效奖励低于 1.95。',
    '% transfer tax: pool and rewards use the net received amount, and you bear the tax, so the effective reward is below 1.95.',
    '% ट्रांसफर टैक्स: पूल और इनाम शुद्ध प्राप्त राशि पर, टैक्स आपका, इसलिए प्रभावी इनाम 1.95 से कम।',
    '% の送金税：入池と報酬は実際の着金純額で計算され、税はご負担のため実効報酬は 1.95 未満です。',
    '% 전송세: 풀과 보상은 실제 입금 순액 기준이며 세금은 사용자 부담이라 실효 보상은 1.95 미만입니다.',
    '% de impuesto: pool y recompensas usan el neto recibido y tú asumes el impuesto, así que la recompensa efectiva es menor a 1.95.',
    '% de taxe : pool et récompenses sur le net reçu, la taxe est à votre charge, la récompense effective est donc sous 1.95.',
    '% Transfersteuer: Pool und Belohnungen auf den Nettoeingang, die Steuer trägst du, daher effektive Belohnung unter 1.95.',
    '% de taxa: pool e recompensas usam o líquido recebido e a taxa é sua, então a recompensa efetiva fica abaixo de 1.95.');
  row('% 转账税：你将支付', '% transfer tax: you will pay ', '% ट्रांसफर टैक्स: आप देंगे ', '% 送金税：支払額 ', '% 전송세: 지불액 ', '% de impuesto: pagarás ', '% de taxe : vous paierez ', '% Transfersteuer: du zahlst ', '% de taxa: você pagará ');
  row('，实际入池', ', net pooled ', ', शुद्ध जमा ', '、実入池 ', ', 실제 입금 ', ', aportado neto ', ', mise nette ', ', netto eingezahlt ', ', líquido no pool ');
  row('% 转账税：你支付标价金额， 实际销毁约为其 ',
    '% transfer tax: you pay the listed amount; actual burn is about ',
    '% ट्रांसफर टैक्स: आप सूचीबद्ध राशि देते हैं; वास्तविक बर्न लगभग ',
    '% 送金税：表示額を支払い、実際のバーンは約 ',
    '% 전송세: 표시 금액을 지불하며 실제 소각은 약 ',
    '% de impuesto: pagas el importe indicado; la quema real es aprox. ',
    '% de taxe : vous payez le montant affiché ; la destruction réelle est d’environ ',
    '% Transfersteuer: du zahlst den Anzeigebetrag; tatsächlicher Burn etwa ',
    '% de taxa: você paga o valor exibido; a queima real é cerca de ');
  row('%，差额为转账税。', '%, the difference is the transfer tax.', '%, अंतर ट्रांसफर टैक्स है।', '%、差額が送金税です。', '%, 차액은 전송세입니다.', '%, la diferencia es el impuesto.', '%, la différence est la taxe.', '%, die Differenz ist die Transfersteuer.', '%, a diferença é a taxa.');
  row('需支付', 'To pay', 'भुगतान', '支払額', '지불액', 'A pagar', 'À payer', 'Zu zahlen', 'A pagar');
  row('实际销毁', 'Actual burn', 'वास्तविक बर्न', '実際のバーン', '실제 소각', 'Quema real', 'Destruction réelle', 'Tatsächlicher Burn', 'Queima real');

  /* ── 晋升与奖励 ── */
  row('晋升与团队奖励', 'Ranks & Team Rewards', 'रैंक और टीम इनाम', '昇格とチーム報酬', '승급과 팀 보상', 'Rangos y equipo', 'Rangs et équipe', 'Ränge & Team', 'Patentes e equipe');
  row('级差 0.3% – 2.7%', 'Differential 0.3% – 2.7%', 'डिफरेंशियल 0.3% – 2.7%', '階差 0.3% – 2.7%', '차등 0.3% – 2.7%', 'Diferencial 0.3% – 2.7%', 'Différentiel 0.3 % – 2,7 %', 'Staffel 0,3 % – 2,7 %', 'Diferencial 0,3% – 2,7%');
  row('团队级差费率 ', 'Team differential rate ', 'टीम डिफरेंशियल दर ', 'チーム階差率 ', '팀 차등 요율 ', 'Tasa diferencial del equipo ', 'Taux différentiel équipe ', 'Team-Staffelsatz ', 'Taxa diferencial da equipe ');
  row('小区业绩 ', 'Leg volume ', 'लेग वॉल्यूम ', '小区業績 ', '소구역 실적 ', 'Volumen de pierna ', 'Volume de branche ', 'Schenkel-Volumen ', 'Volume da perna ');
  row('当前进度', 'Progress', 'प्रगति', '進捗', '진행률', 'Progreso', 'Progression', 'Fortschritt', 'Progresso');
  row('目标等级', 'Target rank', 'लक्ष्य रैंक', '目標レベル', '목표 등급', 'Rango objetivo', 'Rang cible', 'Zielrang', 'Patente alvo');
  row('晋升操作', 'Rank actions', 'रैंक क्रियाएँ', '昇格操作', '승급 작업', 'Acciones de rango', 'Actions de rang', 'Rang-Aktionen', 'Ações de patente');
  row('未购买等级', 'Rank not purchased', 'रैंक नहीं खरीदा', 'レベル未購入', '등급 미구매', 'Rango no comprado', 'Rang non acheté', 'Rang nicht gekauft', 'Patente não comprada');
  row('已达最高等级', 'Max rank reached', 'उच्चतम रैंक', '最高レベル', '최고 등급', 'Rango máximo', 'Rang maximal', 'Höchster Rang', 'Patente máxima');
  row('晋级条件', 'Rank-up requirements', 'रैंक-अप शर्तें', '昇格条件', '승급 조건', 'Requisitos de rango', 'Conditions de rang', 'Aufstiegsbedingungen', 'Requisitos de patente');
  row('小区业绩达标，免费晋级', 'Leg volume met — free rank-up', 'लेग वॉल्यूम पूरा — मुफ़्त रैंक-अप', '小区業績達成で無料昇格', '소구역 실적 달성 시 무료 승급', 'Volumen cumplido: subida gratis', 'Volume atteint : montée gratuite', 'Volumen erfüllt – kostenloser Aufstieg', 'Volume atingido: subida grátis');
  row('7–9 级不可购买，只能靠小区业绩晋级。',
    'Ranks 7–9 can’t be bought; they require leg volume.',
    'रैंक 7–9 खरीदे नहीं जा सकते; लेग वॉल्यूम चाहिए।',
    'レベル7–9は購入不可、小区業績でのみ昇格できます。',
    '7–9등급은 구매 불가, 소구역 실적만으로 승급합니다.',
    'Los rangos 7–9 no se compran; requieren volumen.',
    'Les rangs 7 à 9 ne s’achètent pas ; volume requis.',
    'Ränge 7–9 sind nicht kaufbar; Schenkel-Volumen nötig.',
    'Patentes 7–9 não são compráveis; exigem volume.');
  row('支付代币', 'Payment token', 'भुगतान टोकन', '支払トークン', '결제 토큰', 'Token de pago', 'Jeton de paiement', 'Zahlungs-Token', 'Token de pagamento');
  row('BNB 不能买级；1–6 级付钱直升，不校验业绩。',
    'BNB can’t buy ranks; ranks 1–6 are paid and instant, no volume check.',
    'BNB से रैंक नहीं; रैंक 1–6 भुगतान पर तुरंत, वॉल्यूम जाँच नहीं।',
    'BNB では買級不可。1–6 級は支払いで即昇格、業績審査なし。',
    'BNB로는 등급 구매 불가. 1–6등급은 결제 즉시 승급, 실적 심사 없음.',
    'BNB no compra rangos; 1–6 se pagan al instante, sin volumen.',
    'BNB n’achète pas de rang ; 1–6 payants immédiats, sans volume.',
    'BNB kauft keine Ränge; 1–6 sofort gegen Zahlung, ohne Volumen.',
    'BNB não compra patentes; 1–6 pagas na hora, sem volume.');
  row('该等级不可购买', 'This rank can’t be purchased', 'यह रैंक नहीं खरीदा जा सकता', 'このレベルは購入できません', '이 등급은 구매할 수 없습니다', 'Este rango no se puede comprar', 'Ce rang ne peut être acheté', 'Dieser Rang ist nicht kaufbar', 'Esta patente não pode ser comprada');
  row('团队奖励', 'Team rewards', 'टीम इनाम', 'チーム報酬', '팀 보상', 'Recompensas de equipo', 'Récompenses d’équipe', 'Team-Belohnungen', 'Recompensas de equipe');
  row('级差制，需手动领取', 'Differential model, manual claim', 'डिफरेंशियल मॉडल, मैन्युअल दावा', '階差制・手動受取', '차등 방식, 수동 수령', 'Modelo diferencial, reclamo manual', 'Modèle différentiel, réclamation manuelle', 'Staffelmodell, manuelle Abholung', 'Modelo diferencial, resgate manual');
  row('领取', 'Claim', 'दावा', '受取', '수령', 'Reclamar', 'Réclamer', 'Abholen', 'Resgatar');
  row('领取中...', 'Claiming...', 'दावा हो रहा है...', '受取中...', '수령 중...', 'Reclamando...', 'Réclamation...', 'Hole ab...', 'Resgatando...');
  row('暂无可领取奖励', 'No claimable rewards', 'कोई दावा योग्य इनाम नहीं', '受取可能な報酬なし', '수령 가능 보상 없음', 'Sin recompensas reclamables', 'Aucune récompense à réclamer', 'Keine abholbaren Belohnungen', 'Sem recompensas a resgatar');
  row('下线猜中时，你按级差费率获得对应份额。',
    'When downlines are right, you earn your differential share.',
    'डाउनलाइन सही होने पर आपको डिफरेंशियल हिस्सा मिलता है।',
    'ダウンラインが的中すると、階差率に応じた分を受け取れます。',
    '하위 회원이 정답이면 차등 요율만큼 받습니다.',
    'Cuando tus indicados aciertan, ganas tu diferencial.',
    'Quand vos filleuls gagnent, vous touchez votre différentiel.',
    'Wenn Downlines treffen, erhältst du deinen Staffelanteil.',
    'Quando seus indicados acertam, você ganha seu diferencial.');
  row('（业绩晋级）', '(volume rank-up)', '(वॉल्यूम रैंक-अप)', '（業績昇格）', '(실적 승급)', '(subida por volumen)', '(montée par volume)', '(Aufstieg durch Volumen)', '(subida por volume)');
  row('农户', 'Farmer', 'किसान', '農戸', '농가', 'Agricultor', 'Paysan', 'Landwirt', 'Lavrador');
  row('农商', 'Farm Trader', 'कृषि व्यापारी', '農商', '농상', 'Comerciante agrícola', 'Marchand fermier', 'Agrarhändler', 'Comerciante agrícola');
  row('农主', 'Farm Owner', 'कृषि स्वामी', '農主', '농주', 'Dueño agrícola', 'Propriétaire fermier', 'Agrarbesitzer', 'Proprietário agrícola');
  row('佃户', 'Tenant', 'किरायेदार', '佃戸', '소작농', 'Arrendatario', 'Métayer', 'Pächter', 'Arrendatário');
  row('佃商', 'Tenant Trader', 'किरायेदार व्यापारी', '佃商', '소작상', 'Arrendatario comerciante', 'Métayer marchand', 'Pächter-Händler', 'Arrendatário comerciante');
  row('佃主', 'Tenant Owner', 'किरायेदार स्वामी', '佃主', '소작주', 'Arrendatario dueño', 'Métayer propriétaire', 'Pächter-Eigentümer', 'Arrendatário proprietário');
  row('地户', 'Landholder', 'भूमि धारक', '地戸', '지주', 'Terrateniente', 'Tenancier', 'Grundbesitzer', 'Proprietário de terra');
  row('地商', 'Land Trader', 'भूमि व्यापारी', '地商', '지상', 'Comerciante de tierra', 'Marchand de terre', 'Landhändler', 'Comerciante de terra');
  row('地主', 'Landowner', 'भूस्वामी', '地主', '대지주', 'Gran terrateniente', 'Grand propriétaire', 'Großgrundbesitzer', 'Grande proprietário');

  /* ── 推荐关系面板 / 返回主站 ── */
  row('推荐关系 / 业绩', 'Referrals / Volume', 'रेफरल / वॉल्यूम', '紹介関係 / 業績', '추천 관계 / 실적', 'Referidos / Volumen', 'Parrainage / Volume', 'Empfehlungen / Volumen', 'Indicações / Volume');
  row('正在读取…', 'Reading…', 'पढ़ा जा रहा है…', '読み込み中…', '읽는 중…', 'Leyendo…', 'Lecture…', 'Lese…', 'Lendo…');
  row('上级钱包地址 0x…', 'Upline wallet address 0x…', 'अपलाइन वॉलेट पता 0x…', '上位ウォレットアドレス 0x…', '상위 지갑 주소 0x…', 'Dirección del superior 0x…', 'Adresse du supérieur 0x…', 'Upline-Wallet-Adresse 0x…', 'Endereço do superior 0x…');
  row('绑定上级', 'Bind upline', 'अपलाइन बाइंड करें', '上位をバインド', '상위 바인딩', 'Vincular superior', 'Lier le supérieur', 'Upline binden', 'Vincular superior');
  row('团队业绩（下线）', 'Team volume (downline)', 'टीम वॉल्यूम (डाउनलाइन)', 'チーム業績（ダウンライン）', '팀 실적(하위)', 'Volumen del equipo (downline)', 'Volume équipe (filleuls)', 'Team-Volumen (Downline)', 'Volume da equipe (downline)');
  row('本人 + 团队', 'Self + team', 'स्वयं + टीम', '本人＋チーム', '본인 + 팀', 'Yo + equipo', 'Moi + équipe', 'Selbst + Team', 'Eu + equipe');
  row('未检测到钱包，请在钱包内置浏览器打开',
    'No wallet detected. Open in a wallet browser.', 'वॉलेट नहीं मिला। वॉलेट ब्राउज़र में खोलें।', 'ウォレット未検出。ウォレット内ブラウザで開いてください。', '지갑이 없습니다. 지갑 내 브라우저에서 여세요.',
    'No se detecta billetera. Abre en un navegador de billetera.', 'Aucun portefeuille détecté. Ouvrez dans un navigateur de portefeuille.', 'Keine Wallet gefunden. Im Wallet-Browser öffnen.', 'Carteira não detectada. Abra no navegador da carteira.');
  row('钱包未连接 —— 绑定时会自动请求连接',
    'Wallet not connected — binding will request it', 'वॉलेट कनेक्ट नहीं — बाइंडिंग पर अनुरोध होगा', 'ウォレット未接続 — バインド時に要求します', '지갑 미연결 — 바인딩 시 요청합니다',
    'Billetera no conectada — se pedirá al vincular', 'Portefeuille non connecté — demandé lors de la liaison', 'Wallet nicht verbunden – wird beim Binden angefragt', 'Carteira não conectada — será solicitada ao vincular');
  row('连接钱包并绑定', 'Connect wallet & bind', 'वॉलेट कनेक्ट करें और बाइंड', 'ウォレット接続してバインド', '지갑 연결 후 바인딩', 'Conectar y vincular', 'Connecter et lier', 'Wallet verbinden & binden', 'Conectar e vincular');
  row('点上面的按钮会先请求钱包授权，再发起绑定交易。',
    'The button asks for wallet access, then sends the binding transaction.',
    'बटन पहले वॉलेट अनुमति मांगेगा, फिर बाइंडिंग ट्रांज़ैक्शन भेजेगा।',
    'ボタンはウォレット承認を求め、その後バインド取引を送信します。',
    '버튼이 지갑 승인을 요청한 뒤 바인딩 트랜잭션을 보냅니다.',
    'El botón pide acceso a la billetera y luego envía la transacción.',
    'Le bouton demande l’accès au portefeuille puis envoie la transaction.',
    'Der Button fragt Wallet-Zugriff an und sendet dann die Bindung.',
    'O botão pede acesso à carteira e envia a transação de vínculo.');
  row('根地址无需绑定', 'Root address needs no binding', 'रूट पता को बाइंडिंग नहीं चाहिए', 'ルートアドレスはバインド不要', '루트 주소는 바인딩 불필요', 'La dirección raíz no necesita vínculo', 'L’adresse racine n’a pas besoin de lien', 'Root-Adresse braucht keine Bindung', 'O endereço raiz não precisa de vínculo');
  row('全网第一个地址免绑定；其他地址必须先绑定一个已注册的上级。',
    'The first address is exempt; others must bind a registered upline first.',
    'पहला पता मुक्त है; अन्य को पहले पंजीकृत अपलाइन बाइंड करना होगा।',
    '最初のアドレスは免除。他は登録済みの上位をバインドする必要があります。',
    '첫 주소는 면제, 나머지는 등록된 상위를 먼저 바인딩해야 합니다.',
    'La primera dirección está exenta; las demás deben vincular un superior registrado.',
    'La première adresse est exemptée ; les autres doivent lier un supérieur enregistré.',
    'Die erste Adresse ist befreit; andere müssen eine registrierte Upline binden.',
    'O primeiro endereço é isento; os demais devem vincular um superior registrado.');
  row('已绑定（不可更改）', 'Bound (unchangeable)', 'बाइंड (अपरिवर्तनीय)', 'バインド済み（変更不可）', '바인딩됨(변경 불가)', 'Vinculado (inmutable)', 'Lié (immuable)', 'Gebunden (unveränderlich)', 'Vinculado (imutável)');
  row('绑定关系一经写入不可撤销，也不能改绑。',
    'Binding is permanent and cannot be changed.', 'बाइंडिंग स्थायी है, बदली नहीं जा सकती।', 'バインドは取消・変更できません。', '바인딩은 영구적이며 변경할 수 없습니다.',
    'El vínculo es permanente e inalterable.', 'Le lien est définitif et immuable.', 'Die Bindung ist dauerhaft und nicht änderbar.', 'O vínculo é permanente e não pode ser alterado.');
  row('未绑定上级 —— 现在参与游戏会被拒绝',
    'No upline bound — playing will be rejected', 'अपलाइन बाइंड नहीं — गेम खेलने पर अस्वीकृति', '上位未バインド — 参加は拒否されます', '상위 미바인딩 — 게임 참여가 거부됩니다',
    'Sin superior vinculado — no podrás jugar', 'Aucun supérieur lié — le jeu sera refusé', 'Keine Upline gebunden – Spielen wird abgelehnt', 'Sem superior vinculado — jogar será recusado');
  row('上级必须已经是树内地址（网络根地址，或已绑定过上级的地址），否则绑定会被拒绝。',
    'The upline must already be in the tree (root or already bound), otherwise binding is rejected.',
    'अपलाइन पहले से ट्री में होना चाहिए (रूट या बाइंडेड), वरना बाइंडिंग अस्वीकृत।',
    '上位は既にツリー内（ルートまたはバインド済み）である必要があります。',
    '상위는 이미 트리 내(루트 또는 바인딩됨)여야 하며, 아니면 거부됩니다.',
    'El superior debe estar ya en el árbol (raíz o vinculado).',
    'Le supérieur doit déjà être dans l’arbre (racine ou lié).',
    'Die Upline muss bereits im Baum sein (Root oder gebunden).',
    'O superior já deve estar na árvore (raiz ou vinculado).');
  row('请输入合法的 0x 地址（40 位十六进制）。',
    'Enter a valid 0x address (40 hex characters).', 'मान्य 0x पता दर्ज करें (40 हेक्स)।', '有効な 0x アドレス（40 桁の16進）を入力してください。', '유효한 0x 주소(40자리 16진수)를 입력하세요.',
    'Introduce una dirección 0x válida (40 hex).', 'Saisissez une adresse 0x valide (40 hex).', 'Gültige 0x-Adresse eingeben (40 Hex).', 'Informe um endereço 0x válido (40 hex).');
  row('未检测到钱包。', 'No wallet detected.', 'वॉलेट नहीं मिला।', 'ウォレット未検出。', '지갑이 없습니다.', 'No se detecta billetera.', 'Aucun portefeuille détecté.', 'Keine Wallet gefunden.', 'Carteira não detectada.');
  row('未检测到浏览器钱包，请安装 MetaMask 等钱包插件',
    'No browser wallet detected. Please install MetaMask or similar.',
    'ब्राउज़र वॉलेट नहीं मिला। कृपया MetaMask जैसा वॉलेट इंस्टॉल करें।',
    'ブラウザウォレット未検出。MetaMask などをインストールしてください。',
    '브라우저 지갑이 없습니다. MetaMask 등을 설치하세요.',
    'No se detecta billetera en el navegador. Instala MetaMask u otra similar.',
    'Aucun portefeuille navigateur détecté. Installez MetaMask ou équivalent.',
    'Keine Browser-Wallet gefunden. Bitte MetaMask o. ä. installieren.',
    'Nenhuma carteira no navegador. Instale MetaMask ou similar.');
  row('未授权任何账户', 'No account authorized', 'कोई खाता अधिकृत नहीं', 'アカウントが承認されていません', '승인된 계정 없음', 'Ninguna cuenta autorizada', 'Aucun compte autorisé', 'Kein Konto autorisiert', 'Nenhuma conta autorizada');
  row('等待钱包确认…', 'Waiting for wallet confirmation…', 'वॉलेट पुष्टि की प्रतीक्षा…', 'ウォレット承認待ち…', '지갑 확인 대기…', 'Esperando confirmación…', 'En attente de confirmation…', 'Warte auf Wallet-Bestätigung…', 'Aguardando confirmação…');
  row('你取消了签名。', 'You rejected the signature.', 'आपने हस्ताक्षर रद्द किए।', '署名をキャンセルしました。', '서명을 취소했습니다.', 'Cancelaste la firma.', 'Vous avez annulé la signature.', 'Du hast die Signatur abgelehnt.', 'Você cancelou a assinatura.');
  row('该上级的直推人数已满 50 人（MAX_LEGS），无法再绑定。',
    'This upline already has 50 directs (MAX_LEGS); cannot bind.',
    'इस अपलाइन के 50 डायरेक्ट पूरे (MAX_LEGS); बाइंड नहीं हो सकता।',
    'この上位は直推50人に達しています（MAX_LEGS）。',
    '이 상위는 직추천 50명이 가득했습니다(MAX_LEGS).',
    'Este superior ya tiene 50 directos (MAX_LEGS).',
    'Ce supérieur a déjà 50 directs (MAX_LEGS).',
    'Diese Upline hat bereits 50 Direkte (MAX_LEGS).',
    'Este superior já tem 50 diretos (MAX_LEGS).');
  row('该上级还不是树内地址。请先让他绑定上级，或绑定网络根地址。',
    'This upline is not in the tree yet. Have them bind an upline first, or bind the root address.',
    'यह अपलाइन ट्री में नहीं है। पहले उसे अपलाइन बाइंड कराएँ या रूट पता बाइंड करें।',
    'この上位はまだツリー内ではありません。先に上位をバインドさせるか、ルートをバインドしてください。',
    '이 상위는 아직 트리 내가 아닙니다. 먼저 상위를 바인딩하거나 루트 주소를 바인딩하세요.',
    'Este superior aún no está en el árbol. Haz que vincule uno o vincula la raíz.',
    'Ce supérieur n’est pas encore dans l’arbre. Faites-lui lier un supérieur ou liez la racine.',
    'Diese Upline ist noch nicht im Baum. Lass sie binden oder binde den Root.',
    'Este superior ainda não está na árvore. Faça-o vincular ou vincule a raiz.');
  row('你已经绑定过上级，不能改绑。', 'You already bound an upline; it cannot be changed.', 'आप पहले ही अपलाइन बाइंड कर चुके हैं; बदल नहीं सकते।', '既に上位をバインド済みで変更できません。', '이미 상위를 바인딩했으며 변경할 수 없습니다.', 'Ya vinculaste un superior; no se puede cambiar.', 'Vous avez déjà lié un supérieur ; immuable.', 'Du hast bereits eine Upline gebunden; nicht änderbar.', 'Você já vinculou um superior; não pode mudar.');
  row('不能绑定自己的下级。', 'You cannot bind your own downline.', 'अपनी डाउनलाइन बाइंड नहीं कर सकते।', '自分のダウンラインはバインドできません。', '자신의 하위는 바인딩할 수 없습니다.', 'No puedes vincular a tu propio downline.', 'Impossible de lier votre propre filleul.', 'Du kannst deine eigene Downline nicht binden.', 'Você não pode vincular seu próprio downline.');
  row('不能绑定自己。', 'You cannot bind yourself.', 'स्वयं को बाइंड नहीं कर सकते।', '自分自身はバインドできません。', '자신을 바인딩할 수 없습니다.', 'No puedes vincularte a ti mismo.', 'Impossible de vous lier vous-même.', 'Du kannst dich nicht selbst binden.', 'Você não pode vincular a si mesmo.');
  row('上级地址不能是零地址。', 'The upline cannot be the zero address.', 'अपलाइन शून्य पता नहीं हो सकता।', '上位にゼロアドレスは指定できません。', '상위는 제로 주소일 수 없습니다.', 'El superior no puede ser la dirección cero.', 'Le supérieur ne peut pas être l’adresse zéro.', 'Die Upline darf nicht die Nulladresse sein.', 'O superior não pode ser o endereço zero.');
  row('绑定失败，请稍后重试。', 'Binding failed, please try again later.', 'बाइंडिंग विफल, बाद में प्रयास करें।', 'バインド失敗。後で再試行してください。', '바인딩 실패. 나중에 다시 시도하세요.', 'Error al vincular, inténtalo más tarde.', 'Échec de la liaison, réessayez plus tard.', 'Bindung fehlgeschlagen, später erneut versuchen.', 'Falha ao vincular, tente mais tarde.');
  row('已提交，等待上链…', 'Submitted, waiting for chain…', 'सबमिट, चेन की प्रतीक्षा…', '送信済み、オンチェーン待ち…', '제출됨, 온체인 대기…', 'Enviado, esperando la cadena…', 'Envoyé, en attente de la chaîne…', 'Gesendet, warte auf Chain…', 'Enviado, aguardando a rede…');
  row('等待上链确认…', 'Waiting for confirmation…', 'पुष्टि की प्रतीक्षा…', 'オンチェーン確認待ち…', '온체인 확인 대기…', 'Esperando confirmación…', 'En attente de confirmation…', 'Warte auf Bestätigung…', 'Aguardando confirmação…');
  row('绑定成功。', 'Bound successfully.', 'बाइंडिंग सफल।', 'バインド成功。', '바인딩 완료.', 'Vinculado correctamente.', 'Liaison réussie.', 'Bindung erfolgreich.', 'Vinculado com sucesso.');
  row('仍未检测到绑定，请稍后刷新页面确认。',
    'Binding not detected yet; refresh later to confirm.', 'बाइंडिंग अभी नहीं दिखी; बाद में रीफ़्रेश करें।', 'まだバインドを検出できません。後で再読み込みしてください。', '아직 바인딩이 감지되지 않았습니다. 나중에 새로고침하세요.',
    'Aún no se detecta el vínculo; recarga más tarde.', 'Lien non détecté ; rechargez plus tard.', 'Bindung noch nicht erkannt; später neu laden.', 'Vínculo ainda não detectado; recarregue depois.');
  row('读取失败：', 'Read failed: ', 'पढ़ने में विफल: ', '読み取り失敗：', '읽기 실패: ', 'Error de lectura: ', 'Échec de lecture : ', 'Lesen fehlgeschlagen: ', 'Falha na leitura: ');
  row('← 返回主站', '← Back to main site', '← मुख्य साइट पर', '← メインサイトへ', '← 메인 사이트로', '← Volver al sitio principal', '← Retour au site principal', '← Zur Hauptseite', '← Voltar ao site principal');


  var RULES = [];
  function rule(re, zh, en, hi, ja, ko, es, fr, de, pt) {
    RULES.push({ re: re, t: [zh, en, hi, ja, ko, es, fr, de, pt] });
  }

  /* ── 动态文案（含数字 / 地址 / 代币名） ── */
  rule(/^(\d+) 笔 · 已结算 (\d+)$/,
    '$1 笔 · 已结算 $2', '$1 games · $2 settled', '$1 गेम · $2 सेटल', '$1 件 · 精算 $2 件', '$1건 · 정산 $2건',
    '$1 jugadas · $2 liquidadas', '$1 parties · $2 réglées', '$1 Spiele · $2 abgerechnet', '$1 jogadas · $2 liquidadas');
  rule(/^参与游戏成功 #(\d+)，揭晓后自动结算$/,
    '参与游戏成功 #$1，揭晓后自动结算',
    'Game placed #$1, settles automatically after reveal',
    'गेम #$1 दर्ज, रिवील के बाद सेटल',
    'ゲーム #$1 を登録、公開後に自動精算',
    '게임 #$1 접수, 공개 후 자동 정산',
    'Jugada #$1 registrada, liquida tras el sorteo',
    'Partie #$1 enregistrée, règlement après révélation',
    'Spiel #$1 gesetzt, Abrechnung nach Aufdeckung',
    'Jogada #$1 registrada, liquida após o sorteio');
  rule(/^#(\d+) 结算失败（(.+)），已固化哈希，可稍后重试$/,
    '#$1 结算失败（$2），已固化哈希，可稍后重试',
    '#$1 settlement failed ($2); hash frozen, retry later',
    '#$1 सेटल विफल ($2); हैश फ्रीज़, बाद में प्रयास',
    '#$1 精算失敗（$2）。ハッシュ確定済、後で再試行',
    '#$1 정산 실패($2), 해시 확정됨, 나중에 재시도',
    '#$1 fallo de liquidación ($2); hash congelado, reintenta',
    '#$1 échec de règlement ($2) ; hash figé, réessayez',
    '#$1 Abrechnung fehlgeschlagen ($2); Hash fixiert, später erneut',
    '#$1 falha na liquidação ($2); hash congelado, tente depois');
  rule(/^(\d+) 秒$/,
    '$1 秒', '$1s', '$1 सेकंड', '$1 秒', '$1초', '$1 s', '$1 s', '$1 s', '$1 s');
  rule(/^(\d+) 分 (\d+) 秒$/,
    '$1 分 $2 秒', '$1m $2s', '$1 मिनट $2 सेकंड', '$1 分 $2 秒', '$1분 $2초', '$1 min $2 s', '$1 min $2 s', '$1 Min. $2 s', '$1 min $2 s');
  rule(/^(\d+) 分钟$/,
    '$1 分钟', '$1 min', '$1 मिनट', '$1 分', '$1분', '$1 min', '$1 min', '$1 Min.', '$1 min');
  rule(/^下一级需 (.+) USD$/,
    '下一级需 $1 USD', 'Next rank needs $1 USD', 'अगला रैंक: $1 USD', '次レベルまで $1 USD', '다음 등급까지 $1 USD',
    'Siguiente rango: $1 USD', 'Rang suivant : $1 USD', 'Nächster Rang: $1 USD', 'Próxima patente: $1 USD');
  rule(/^已升级到 (.+)$/,
    '已升级到 $1', 'Upgraded to $1', '$1 पर अपग्रेड', '$1 に昇格', '$1(으)로 승급', 'Mejorado a $1', 'Amélioré : $1', 'Aufgestiegen zu $1', 'Melhorado para $1');
  rule(/^已晋级到 (.+)$/,
    '已晋级到 $1', 'Ranked up to $1', '$1 पर रैंक-अप', '$1 に昇格', '$1(으)로 승급', 'Subido a $1', 'Promu : $1', 'Aufgestiegen zu $1', 'Subiu para $1');
  rule(/^晋级 (.+)$/,
    '晋级 $1', 'Rank up $1', '$1 रैंक-अप', '$1 に昇格', '$1 승급', 'Subir a $1', 'Monter : $1', 'Aufsteigen: $1', 'Subir para $1');
  rule(/^购买 (.+)$/,
    '购买 $1', 'Buy $1', '$1 खरीदें', '$1 を購入', '$1 구매', 'Comprar $1', 'Acheter $1', 'Kaufen: $1', 'Comprar $1');
  rule(/^已固化哈希 #(\d+)，此后永久可结算$/,
    '已固化哈希 #$1，此后永久可结算', 'Hash frozen #$1; settleable forever', 'हैश फ्रीज़ #$1; सदा सेटल योग्य', 'ハッシュ確定 #$1、以後恒久精算可能', '해시 확정 #$1, 이후 영구 정산 가능',
    'Hash congelado #$1; liquidable siempre', 'Hash figé #$1 ; réglable à jamais', 'Hash fixiert #$1; dauerhaft abrechenbar', 'Hash congelado #$1; liquidável sempre');
  rule(/^已结算 #(\d+)$/,
    '已结算 #$1', 'Settled #$1', 'सेटल #$1', '精算 #$1', '정산 #$1', 'Liquidado #$1', 'Réglé #$1', 'Abgerechnet #$1', 'Liquidado #$1');
  rule(/^已释放敞口 #(\d+)$/,
    '已释放敞口 #$1', 'Exposure released #$1', 'एक्सपोज़र छोड़ा #$1', 'エクスポージャー解放 #$1', '노출 해제 #$1', 'Exposición liberada #$1', 'Exposition libérée #$1', 'Exposure freigegeben #$1', 'Exposição liberada #$1');
  rule(/^已领取 (.+) 团队奖励$/,
    '已领取 $1 团队奖励', 'Claimed $1 team reward', '$1 टीम इनाम प्राप्त', '$1 のチーム報酬を受取', '$1 팀 보상 수령', 'Recompensa de equipo $1 reclamada', 'Récompense d’équipe $1 réclamée', '$1 Team-Belohnung abgeholt', 'Recompensa de equipe $1 resgatada');
  rule(/^当前链 (\d+)$/,
    '当前链 $1', 'Chain $1', 'चेन $1', 'チェーン $1', '체인 $1', 'Cadena $1', 'Chaîne $1', 'Chain $1', 'Rede $1');
  rule(/^成为农场主（(.+)）$/,
    '成为农场主（$1）', 'Become farm owner ($1)', 'फार्म ओनर बनें ($1)', '農場主になる（$1）', '농장주 되기 ($1)', 'Ser granjero ($1)', 'Devenir fermier ($1)', 'Farmer werden ($1)', 'Ser fazendeiro ($1)');
  rule(/^有 (.+) (.+) 正被未结算的游戏占用，等这些游戏结算后即可赎回。$/,
    '有 $1 $2 正被未结算的游戏占用，等这些游戏结算后即可赎回。',
    '$1 $2 is locked by unsettled games; redeemable once they settle.',
    '$1 $2 असेटल गेम में लॉक; सेटल होने पर रिडीम योग्य।',
    '$1 $2 は未精算のゲームで使用中。精算後に償還できます。',
    '$1 $2은 미정산 게임에 잠겨 있으며, 정산 후 상환할 수 있습니다.',
    '$1 $2 está bloqueado por partidas sin liquidar; podrás retirarlo al liquidarse.',
    '$1 $2 est verrouillé par des parties non réglées ; rachetable après règlement.',
    '$1 $2 ist durch nicht abgerechnete Spiele gebunden; danach einlösbar.',
    '$1 $2 está bloqueado por jogos não liquidados; resgatável após liquidarem.');
  rule(/^（转账税 (.+)%）$/,
    '（转账税 $1%）', '($1% transfer tax)', '(ट्रांसफर टैक्स $1%)', '（送金税 $1%）', '(전송세 $1%)', '(impuesto $1%)', '(taxe $1 %)', '($1 % Transfersteuer)', '(taxa $1%)');
  rule(/^（需付 (.+)）$/,
    '（需付 $1）', '(pay $1)', '($1 देना होगा)', '（$1 を支払）', '($1 지불)', '(pagar $1)', '(payer $1)', '($1 zahlen)', '(pagar $1)');
  rule(/^网络根地址（(.+)）—— 无需绑定，可直接参与游戏$/,
    '网络根地址（$1）—— 无需绑定，可直接参与游戏',
    'Root address ($1) — no binding needed, you can play directly',
    'रूट पता ($1) — बाइंडिंग नहीं चाहिए, सीधे खेल सकते हैं',
    'ルートアドレス（$1）— バインド不要、そのまま参加できます',
    '루트 주소($1) — 바인딩 없이 바로 참여할 수 있습니다',
    'Dirección raíz ($1): sin vínculo, puedes jugar directamente',
    'Adresse racine ($1) : aucun lien requis, vous pouvez jouer',
    'Root-Adresse ($1) – keine Bindung nötig, direkt spielbar',
    'Endereço raiz ($1): sem vínculo, pode jogar direto');
  rule(/^已绑定上级：(.+)$/,
    '已绑定上级：$1', 'Upline bound: $1', 'अपलाइन बाइंड: $1', '上位バインド済み：$1', '상위 바인딩됨: $1', 'Superior vinculado: $1', 'Supérieur lié : $1', 'Upline gebunden: $1', 'Superior vinculado: $1');
  rule(/^等待上链确认…（(\d+)\/(\d+)）$/,
    '等待上链确认…（$1/$2）', 'Waiting for confirmation… ($1/$2)', 'पुष्टि की प्रतीक्षा… ($1/$2)', '確認待ち…（$1/$2）', '확인 대기… ($1/$2)',
    'Esperando confirmación… ($1/$2)', 'En attente de confirmation… ($1/$2)', 'Warte auf Bestätigung… ($1/$2)', 'Aguardando confirmação… ($1/$2)');
  rule(/^网络错误 · 需 (.+)$/,
    '网络错误 · 需 $1', 'Network error · need $1', 'नेटवर्क त्रुटि · चाहिए $1', 'ネットワークエラー · 必要 $1', '네트워크 오류 · 필요 $1',
    'Error de red · se necesita $1', 'Erreur réseau · requis $1', 'Netzwerkfehler · benötigt $1', 'Erro de rede · precisa $1');
  rule(/^读取失败：(.+)$/,
    '读取失败：$1', 'Read failed: $1', 'पढ़ने में विफल: $1', '読み取り失敗：$1', '읽기 실패: $1', 'Error de lectura: $1', 'Échec de lecture : $1', 'Lesen fehlgeschlagen: $1', 'Falha na leitura: $1');
  rule(/^最大 (.+)$/,
    '最大 $1', 'Max $1', 'अधिकतम $1', '最大 $1', '최대 $1', 'Máx. $1', 'Max $1', 'Max. $1', 'Máx. $1');
  rule(/^余额 (.+)$/,
    '余额 $1', 'Balance $1', 'बैलेंस $1', '残高 $1', '잔액 $1', 'Saldo $1', 'Solde $1', 'Guthaben $1', 'Saldo $1');

  var byZh = Object.create(null);
  for (var i = 0; i < ROWS.length; i++) byZh[ROWS[i][0].trim()] = ROWS[i];

  var CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TITLE: 1, NOSCRIPT: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label'];

  var langIdx = 0;
  var originals = new WeakMap();
  var attrOriginals = new WeakMap();

  function readStored() {
    try {
      var q = String(location.search || '').match(/[?&]lang=([a-z]{2})/);
      if (q && LANGS.indexOf(q[1]) >= 0) return q[1];
      var v = localStorage.getItem(KEY);
      if (v && LANGS.indexOf(v) >= 0) return v;
    } catch (e) {}
    return DEFAULT_LANG;
  }

  function render(raw) {
    if (langIdx === 0) return raw;
    var lead = raw.match(/^[\s\u00a0]*/)[0];
    var trail = raw.match(/[\s\u00a0]*$/)[0];
    var core = raw.slice(lead.length, raw.length - trail.length);
    if (!core) return null;
    var out = null;
    var r = byZh[core];
    if (r) out = r[langIdx];
    if (out === null) {
      for (var k = 0; k < RULES.length; k++) {
        var m = core.match(RULES[k].re);
        if (m) {
          out = RULES[k].t[langIdx].replace(/\$(\d)/g, function (all, d) {
            return m[Number(d)] == null ? '' : lookupCapture(m[Number(d)]);
          });
          break;
        }
      }
    }
    if (out === null) return null;
    return lead + out + trail;
  }

  function lookupCapture(cap) {
    var key = String(cap == null ? '' : cap).trim();
    var r = byZh[key];
    if (r) return r[langIdx];
    return cap;
  }

  function applyText(node) {
    var parent = node.parentNode;
    if (!parent || SKIP_TAGS[parent.nodeName]) return;
    var cur = node.nodeValue;
    if (!cur) return;
    var rec = originals.get(node);
    if (rec) {
      if (cur !== rec.t && cur !== rec.o) {
        if (!CJK.test(cur)) { originals.delete(node); return; }
        rec = { o: cur, t: null };
        originals.set(node, rec);
      }
    } else {
      if (!CJK.test(cur)) return;
      rec = { o: cur, t: null };
      originals.set(node, rec);
    }
    var out = render(rec.o);
    if (out === null) return;
    if (out !== cur) node.nodeValue = out;
    rec.t = out;
  }

  function applyAttrs(el) {
    var store = attrOriginals.get(el);
    if (!store) { store = {}; attrOriginals.set(el, store); }
    for (var a = 0; a < ATTRS.length; a++) {
      var name = ATTRS[a];
      if (!el.hasAttribute(name)) continue;
      var cur = el.getAttribute(name);
      var rec = store[name];
      if (rec) {
        if (cur !== rec.t && cur !== rec.o) {
          if (!CJK.test(cur)) { delete store[name]; continue; }
          rec = { o: cur, t: null };
          store[name] = rec;
        }
      } else {
        if (!CJK.test(cur)) continue;
        rec = { o: cur, t: null };
        store[name] = rec;
      }
      var out = render(rec.o);
      if (out === null) continue;
      if (out !== cur) el.setAttribute(name, out);
      rec.t = out;
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { applyText(root); return; }
    if (root.nodeType !== 1) return;
    applyAttrs(root);
    var tw = document.createTreeWalker(root, 5, null, false);
    var n = tw.nextNode();
    while (n) {
      if (n.nodeType === 3) applyText(n);
      else if (n.nodeType === 1) applyAttrs(n);
      n = tw.nextNode();
    }
  }

  function applyMeta() {
    document.title = TITLES[langIdx];
    var m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', DESCS[langIdx]);
    document.documentElement.setAttribute('lang', LANGS[langIdx] === 'zh' ? 'zh-CN' : LANGS[langIdx]);
  }

  function buildSelector() {
    var host = document.querySelector('.topbar-spacer');
    if (!host) return;
    var sel = document.getElementById('farmLangSel');
    if (!sel) {
      sel = document.createElement('select');
      sel.id = 'farmLangSel';
      sel.setAttribute('aria-label', 'Language');
      for (var k = 0; k < LANGS.length; k++) {
        var o = document.createElement('option');
        o.value = LANGS[k];
        o.textContent = NAMES[LANGS[k]];
        sel.appendChild(o);
      }
      sel.style.cssText = [
        'font:600 12px/1 system-ui,-apple-system,"Segoe UI",sans-serif',
        'border-radius:6px', 'padding:6px 8px', 'margin-right:8px',
        'background:#1a2233', 'color:#fff', 'border:1px solid #283040',
        'cursor:pointer', 'outline:none'
      ].join(';');
      sel.addEventListener('change', function () { setLang(sel.value, true); });
    }
    if (sel.parentNode !== host) {
      host.style.display = 'flex';
      host.style.alignItems = 'center';
      host.style.justifyContent = 'flex-end';
      host.appendChild(sel);
    }
    sel.value = LANGS[langIdx];
  }

  function setLang(v, persist) {
    var idx = LANGS.indexOf(v);
    if (idx < 0) idx = LANGS.indexOf(DEFAULT_LANG);
    if (persist) { try { localStorage.setItem(KEY, LANGS[idx]); } catch (e) {} }
    if (idx === langIdx) { buildSelector(); return; }
    langIdx = idx;
    applyMeta();
    buildSelector();
    walk(document.body);
  }

  function boot() {
    langIdx = LANGS.indexOf(readStored());
    if (langIdx < 0) langIdx = LANGS.indexOf(DEFAULT_LANG);
    applyMeta();
    buildSelector();
    walk(document.body);

    var mo = new MutationObserver(function (records) {
      for (var k = 0; k < records.length; k++) {
        var r = records[k];
        if (r.type === 'characterData') applyText(r.target);
        else if (r.type === 'childList') {
          for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
        } else if (r.type === 'attributes') applyAttrs(r.target);
      }
      buildSelector();
    });
    mo.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });

    window.addEventListener('storage', function (e) {
      if (e.key === KEY && e.newValue) setLang(e.newValue, false);
    });

    window.FARM_I18N = {
      langs: LANGS.slice(),
      names: NAMES,
      get: function () { return LANGS[langIdx]; },
      set: function (v) { setLang(v, true); }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
