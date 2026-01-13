import { Voyage, Waypoint, IconTheme } from './types';

// --- Critical Navigation Waypoints (Sea Lanes) ---
// These invisible points enforce the ship to follow water routes around continents.
const WP_TAIWAN_STRAIT = { lat: 25.0, lng: 121.0 }; 
const WP_VIETNAM_COAST = { lat: 11.5, lng: 110.5 }; 
const WP_SINGAPORE_STRAIT = { lat: 1.4, lng: 104.5 }; // Critical to avoid crossing Malay Peninsula
const WP_SUMATRA_TIP = { lat: 6.0, lng: 95.2 }; // Aceh, entering Bay of Bengal
const WP_SRI_LANKA_SOUTH = { lat: 5.8, lng: 80.2 }; // Rounding India
const WP_ARABIAN_SEA_MID = { lat: 13.0, lng: 63.0 }; 

// --- Stops (Cities) ---
const NANJING = { lat: 32.06, lng: 118.80 };
const LIUJIAGANG = { lat: 31.45, lng: 121.1 };
const VIETNAM_CHAMPA = { lat: 13.9, lng: 109.3 }; // Quy Nhon
const JAVA_MAJAPAHIT = { lat: -6.5, lng: 107.0 }; // Near Jakarta/Surabaya
const PALEMBANG = { lat: -2.99, lng: 104.75 }; // Old Port
const MALACCA = { lat: 2.2, lng: 102.25 }; 
const SUMATRA_PASAI = { lat: 5.1, lng: 97.1 }; // Samudera
const SRI_LANKA_BERUWALA = { lat: 6.5, lng: 79.9 }; 
const CALICUT = { lat: 11.25, lng: 75.78 }; 
const COCHIN = { lat: 9.93, lng: 76.26 };
const HORMUZ = { lat: 27.1, lng: 56.5 }; 
const ADEN = { lat: 12.8, lng: 45.0 }; 
const MOGADISHU = { lat: 2.04, lng: 45.34 }; 
const MALINDI = { lat: -3.2, lng: 40.1 }; 
const DHOFAR = { lat: 17.0, lng: 54.1 };
const MECCA_JEDDAH = { lat: 21.5, lng: 39.1 };

// --- Historical Images ---
const IMG_GIRAFFE = "https://upload.wikimedia.org/wikipedia/commons/d/d7/Zheng_He_Giraffe.jpg";
const IMG_FLEET = "https://upload.wikimedia.org/wikipedia/commons/6/6c/Zheng_He%27s_ship_compared_to_Columbus%27s.jpg"; 
const IMG_MAP = "https://upload.wikimedia.org/wikipedia/commons/3/3a/Zheng_He_sailing_chart.gif";
const IMG_STELE = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Galle_Trilingual_Inscription.jpg/450px-Galle_Trilingual_Inscription.jpg";
const IMG_PORCELAIN = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Ming_Blue_and_White_Bowl.jpg/640px-Ming_Blue_and_White_Bowl.jpg";

// Helper
const createStop = (name: string, coords: {lat: number, lng: number}, eventLabel: string, trade: string, diplomacy: string, iconType: IconTheme, imageUrl?: string): Waypoint => ({
  name,
  ...coords,
  type: 'STOP',
  eventLabel,
  trade,
  diplomacy,
  iconType,
  imageUrl
});

const turn = (coords: {lat: number, lng: number}): Waypoint => ({ name: '', ...coords, type: 'TURN', iconType: 'MAP' });

export const VOYAGE_DATA: Record<number, Voyage> = {
  1: {
    id: 1,
    title: "首航立威 (1405)",
    years: "1405 - 1407",
    description: "两万七千人誓师首航，途径东南亚至印度，肃清海盗。",
    color: "#eab308", 
    path: [
      createStop("南京", NANJING, "🚩 宝船厂誓师", "丝绸、瓷器", "明成祖朱棣颁布诏书，组建浩大船队。", 'FLEET', IMG_FLEET),
      createStop("刘家港", LIUJIAGANG, "⚓ 船队集结", "补给", "祭祀妈祖，整装待发。", 'FLEET'),
      turn(WP_TAIWAN_STRAIT),
      createStop("占城", VIETNAM_CHAMPA, "🤝 建立邦交", "沉香、象牙", "访问占城王，确立朝贡关系。", 'DIPLOMACY'),
      turn(WP_VIETNAM_COAST),
      createStop("爪哇", JAVA_MAJAPAHIT, "⚖️ 调解内战", "胡椒", "调解东王西王之战，维护地区和平。", 'DIPLOMACY'),
      createStop("旧港", PALEMBANG, "⚔️ 生擒海盗", "—", "击溃海盗陈祖义，其被押回南京斩首。", 'BATTLE'),
      turn(WP_SINGAPORE_STRAIT),
      createStop("满剌加", MALACCA, "🏰 建立官厂", "锡、热带货物", "建立大明在南洋最大的中转仓库。", 'TRADE'),
      turn(WP_SUMATRA_TIP),
      createStop("锡兰", SRI_LANKA_BERUWALA, "🙏 礼佛布施", "宝石", "在佛寺布施，展现文化包容。", 'MAP', IMG_STELE),
      turn(WP_SRI_LANKA_SOUTH),
      createStop("古里", CALICUT, "📍 确立中心", "胡椒、棉布", "立碑纪念，确立为西洋贸易集散地。", 'TRADE')
    ]
  },
  2: {
    id: 2,
    title: "册封诸国 (1407)",
    years: "1407 - 1409",
    description: "护送各国使臣回国，并对沿途国王进行正式册封。",
    color: "#38bdf8",
    path: [
      createStop("南京", NANJING, "🔙 护送使臣", "丝绸", "护送苏门答腊等国使臣回国。", 'FLEET'),
      turn(WP_TAIWAN_STRAIT),
      turn(WP_VIETNAM_COAST),
      turn(WP_SINGAPORE_STRAIT),
      createStop("满剌加", MALACCA, "👑 册封国王", "锡", "册封满剌加国王，确立其政治地位。", 'DIPLOMACY'),
      turn(WP_SUMATRA_TIP),
      createStop("锡兰", SRI_LANKA_BERUWALA, "📜 巩固关系", "宝石", "立《布施锡兰山古碑》（三语碑）。", 'MAP', IMG_STELE),
      turn(WP_SRI_LANKA_SOUTH),
      createStop("柯枝", COCHIN, "👑 册封柯枝", "胡椒", "赐柯枝国王诰印。", 'DIPLOMACY')
    ]
  },
  3: {
    id: 3,
    title: "平定锡兰 (1409)",
    years: "1409 - 1411",
    description: "锡兰山王亚烈苦奈儿负隅顽抗，郑和设计将其生擒。",
    color: "#a78bfa",
    path: [
      createStop("南京", NANJING, "⚓ 再次启航", "—", "—", 'FLEET'),
      turn(WP_TAIWAN_STRAIT),
      turn(WP_VIETNAM_COAST),
      turn(WP_SINGAPORE_STRAIT),
      createStop("满剌加", MALACCA, "📦 扩建仓库", "—", "完善远洋补给体系。", 'TRADE'),
      turn(WP_SUMATRA_TIP),
      createStop("锡兰", SRI_LANKA_BERUWALA, "⚔️ 平定叛乱", "宝石", "锡兰王诱骗明军，郑和突袭王城生擒之。", 'BATTLE'),
      turn(WP_SRI_LANKA_SOUTH),
      turn(WP_ARABIAN_SEA_MID),
      createStop("忽鲁谟斯", HORMUZ, "🕌 远达波斯", "地毯、珍珠", "船队首次抵达波斯湾，震惊西方。", 'MAP') 
    ]
  },
  4: {
    id: 4,
    title: "生擒伪王 (1413)",
    years: "1413 - 1415",
    description: "随行翻译马欢记录了沿途大量风土人情。",
    color: "#34d399",
    path: [
      createStop("南京", NANJING, "📖 马欢随行", "—", "翻译官马欢随行，后著《瀛涯胜览》。", 'MAP', IMG_MAP),
      turn(WP_TAIWAN_STRAIT),
      turn(WP_VIETNAM_COAST),
      turn(WP_SINGAPORE_STRAIT),
      createStop("苏门答腊", SUMATRA_PASAI, "⚔️ 生擒苏干剌", "—", "平定苏干剌叛乱，维护航道安全。", 'BATTLE'),
      turn(WP_SUMATRA_TIP),
      createStop("马尔代夫", {lat: 3.2, lng: 73.2}, "🐚 购买龙涎", "龙涎香", "采购极其珍贵的龙涎香。", 'TRADE'),
      turn(WP_ARABIAN_SEA_MID),
      createStop("忽鲁谟斯", HORMUZ, "💎 贸易往来", "宝石", "与波斯商人进行大规模贸易。", 'TRADE', IMG_PORCELAIN)
    ]
  },
  5: {
    id: 5,
    title: "麒麟现世 (1417)",
    years: "1417 - 1419",
    description: "最远到达非洲东岸，带回了传说中的“麒麟”。",
    color: "#f472b6",
    path: [
      createStop("南京", NANJING, "⚓ 护送十七国", "—", "护送17国使臣返乡。", 'FLEET'),
      turn(WP_TAIWAN_STRAIT),
      turn(WP_VIETNAM_COAST),
      turn(WP_SINGAPORE_STRAIT),
      turn(WP_SUMATRA_TIP),
      turn(WP_SRI_LANKA_SOUTH),
      createStop("阿丹", ADEN, "🦒 进贡麒麟", "麒麟(长颈鹿)", "也门国王进贡长颈鹿，明朝以此为瑞兽麒麟。", 'GIRAFFE', IMG_GIRAFFE),
      createStop("木骨都束", MOGADISHU, "🦁 非洲探险", "狮子、花豹", "深入索马里，带回斑马狮子。", 'GIRAFFE'),
      createStop("麻林", MALINDI, "🦓 极远之地", "珍禽异兽", "抵达肯尼亚马林迪。", 'GIRAFFE', IMG_GIRAFFE)
    ]
  },
  6: {
    id: 6,
    title: "再访东非 (1421)",
    years: "1421 - 1422",
    description: "郑和分遣舰队深入探索，航迹遍布阿拉伯半岛。",
    color: "#fb923c",
    path: [
      createStop("南京", NANJING, "⚓ 再次护送", "丝绸", "护送忽鲁谟斯等国使臣。", 'FLEET'),
      turn(WP_TAIWAN_STRAIT),
      turn(WP_VIETNAM_COAST),
      turn(WP_SINGAPORE_STRAIT),
      createStop("满剌加", MALACCA, "🚢 经停补给", "—", "舰队在马六甲集结休整。", 'TRADE'),
      turn(WP_SUMATRA_TIP),
      createStop("锡兰", SRI_LANKA_BERUWALA, "🙏 再次布施", "—", "途径锡兰山。", 'MAP'),
      turn(WP_SRI_LANKA_SOUTH),
      createStop("祖法儿", DHOFAR, "🏺 乳香贸易", "乳香", "在阿拉伯半岛进行大规模乳香贸易。", 'TRADE'),
      createStop("摩加迪沙", MOGADISHU, "🌍 非洲巡航", "—", "巩固与东非诸国的宗藩关系。", 'DIPLOMACY')
    ]
  },
  7: {
    id: 7,
    title: "最后航程 (1431)",
    years: "1431 - 1433",
    description: "宣德年间最后一次远航，郑和病逝于归途。",
    color: "#ef4444",
    path: [
      createStop("南京", NANJING, "⚓ 宣德复航", "—", "停罢多年后，宣德帝下令重启下西洋。", 'FLEET'),
      turn(WP_TAIWAN_STRAIT),
      createStop("越南", VIETNAM_CHAMPA, "🌴 途中休整", "—", "—", 'MAP'),
      turn(WP_SINGAPORE_STRAIT),
      createStop("满剌加", MALACCA, "🚢 经停补给", "—", "—", 'TRADE'),
      turn(WP_SUMATRA_TIP),
      createStop("锡兰", SRI_LANKA_BERUWALA, "🙏 礼佛", "—", "—", 'MAP'),
      createStop("古里", CALICUT, "🕯️ 郑和病逝", "—", "伟大的航海家于返航途中在古里病逝。", 'FLEET'),
      turn(WP_ARABIAN_SEA_MID),
      createStop("天方", MECCA_JEDDAH, "🕋 麦加朝觐", "—", "分队抵达麦加（天方），绘制《天方图》。", 'MAP', IMG_MAP)
    ]
  }
};