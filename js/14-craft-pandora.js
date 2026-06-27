// ========== 製作系統核心邏輯 ==========

// 1. 定義製作配方
const CRAFT_RECIPES = {
    // 💍 賽巴斯（奇岩 寶石加工坊）：4 屬性戒指（神聖獨角獸之角×5＋月光之氣息×1＋粗糙的米索莉塊×50＋魔法寶石×30＋四種高品質寶石各×5＋金幣200萬）＋4 精靈皮帶（皮帶×1＋對應龍鱗×3＋元素石×5）
    npc_sebas: [
        { result: 'acc_ring_magic', req: [{ id: 'mat_unicorn_horn', cnt: 5 }, { id: 'mat_moonlight_breath', cnt: 1 }, { id: 'new_item_164', cnt: 50 }, { id: 'new_item_150', cnt: 30 }, { id: 'new_item_159', cnt: 5 }, { id: 'new_item_156', cnt: 5 }, { id: 'new_item_162', cnt: 5 }, { id: 'new_item_153', cnt: 5 }, { id: 'gold', cnt: 2000000 }] },
        { result: 'acc_ring_str',   req: [{ id: 'mat_unicorn_horn', cnt: 5 }, { id: 'mat_moonlight_breath', cnt: 1 }, { id: 'new_item_164', cnt: 50 }, { id: 'new_item_150', cnt: 30 }, { id: 'new_item_159', cnt: 5 }, { id: 'new_item_156', cnt: 5 }, { id: 'new_item_162', cnt: 5 }, { id: 'new_item_153', cnt: 5 }, { id: 'gold', cnt: 2000000 }] },
        { result: 'acc_ring_dex',   req: [{ id: 'mat_unicorn_horn', cnt: 5 }, { id: 'mat_moonlight_breath', cnt: 1 }, { id: 'new_item_164', cnt: 50 }, { id: 'new_item_150', cnt: 30 }, { id: 'new_item_159', cnt: 5 }, { id: 'new_item_156', cnt: 5 }, { id: 'new_item_162', cnt: 5 }, { id: 'new_item_153', cnt: 5 }, { id: 'gold', cnt: 2000000 }] },
        { result: 'acc_ring_int',   req: [{ id: 'mat_unicorn_horn', cnt: 5 }, { id: 'mat_moonlight_breath', cnt: 1 }, { id: 'new_item_164', cnt: 50 }, { id: 'new_item_150', cnt: 30 }, { id: 'new_item_159', cnt: 5 }, { id: 'new_item_156', cnt: 5 }, { id: 'new_item_162', cnt: 5 }, { id: 'new_item_153', cnt: 5 }, { id: 'gold', cnt: 2000000 }] },
        { result: 'acc_belt_fire',  req: [{ id: 'new_item_181', cnt: 1 }, { id: 'new_item_192', cnt: 3 }, { id: 'new_item_165', cnt: 5 }] },
        { result: 'acc_belt_water', req: [{ id: 'new_item_181', cnt: 1 }, { id: 'new_item_190', cnt: 3 }, { id: 'new_item_165', cnt: 5 }] },
        { result: 'acc_belt_earth', req: [{ id: 'new_item_181', cnt: 1 }, { id: 'new_item_191', cnt: 3 }, { id: 'new_item_165', cnt: 5 }] },
        { result: 'acc_belt_wind',  req: [{ id: 'new_item_181', cnt: 1 }, { id: 'new_item_193', cnt: 3 }, { id: 'new_item_165', cnt: 5 }] }
    ],
    // 🏛️ 可羅蘭斯（沉默洞穴）：封印的歷史書八頁→製作武器秘笈；秘笈＋對應素材武器＋素材 → 5 件傳說武器（doCraft 會自動遞迴合成缺少的秘笈）
    npc_kororanz: [
        { result: 'mat_rasta_codex', req: [{ id: 'mat_history_1', cnt: 1 }, { id: 'mat_history_2', cnt: 1 }, { id: 'mat_history_3', cnt: 1 }, { id: 'mat_history_4', cnt: 1 }, { id: 'mat_history_5', cnt: 1 }, { id: 'mat_history_6', cnt: 1 }, { id: 'mat_history_7', cnt: 1 }, { id: 'mat_history_8', cnt: 1 }] },
        { result: 'wpn_emperor_blade', req: [{ id: 'mat_rasta_codex', cnt: 1 }, { id: 'wpn_official_2h', cnt: 1 }, { id: 'mat_blackmithril_plate', cnt: 10 }, { id: 'mat_black_powder', cnt: 50 }, { id: 'mat_holy_relic', cnt: 100 }, { id: 'mat_black_blood', cnt: 50 }] },
        { result: 'wpn_windblade_dagger', req: [{ id: 'mat_rasta_codex', cnt: 1 }, { id: 'wpn_official_blade', cnt: 1 }, { id: 'mat_blackmithril_plate', cnt: 10 }, { id: 'mat_black_powder', cnt: 50 }, { id: 'mat_holy_relic', cnt: 100 }, { id: 'mat_black_blood', cnt: 50 }] },
        { result: 'wpn_redshadow_dual', req: [{ id: 'mat_rasta_codex', cnt: 1 }, { id: 'wpn_assassin_mark', cnt: 1 }, { id: 'mat_blackmithril_plate', cnt: 10 }, { id: 'mat_black_powder', cnt: 50 }, { id: 'mat_holy_relic', cnt: 100 }, { id: 'mat_black_blood', cnt: 50 }] },
        { result: 'wpn_beastking_claw', req: [{ id: 'mat_rasta_codex', cnt: 1 }, { id: 'wpn_baranka_claw', cnt: 1 }, { id: 'mat_blackmithril_plate', cnt: 10 }, { id: 'mat_black_powder', cnt: 50 }, { id: 'mat_holy_relic', cnt: 100 }, { id: 'mat_black_blood', cnt: 50 }] },
        { result: 'wpn_holycrystal_wand', req: [{ id: 'mat_rasta_codex', cnt: 1 }, { id: 'wpn_priest_wand', cnt: 1 }, { id: 'mat_blackmithril_plate', cnt: 10 }, { id: 'mat_black_powder', cnt: 50 }, { id: 'mat_holy_relic', cnt: 100 }, { id: 'mat_black_blood', cnt: 50 }] }
    ],
    // 🏴‍☠️❄️ 大衛（歐瑞村 寶石加工）：冰之女王的耳環逐級精煉，每級＝前一級 + 冰之結晶×1；Lv8 六屬性擇一
    npc_david: [
        { result: 'acc_icequeen_ear_1', req: [{ id: 'acc_icequeen_ear_0', cnt: 1 }, { id: 'mat_ice_crystal', cnt: 1 }] },
        { result: 'acc_icequeen_ear_2', req: [{ id: 'acc_icequeen_ear_1', cnt: 1 }, { id: 'mat_ice_crystal', cnt: 1 }] },
        { result: 'acc_icequeen_ear_3', req: [{ id: 'acc_icequeen_ear_2', cnt: 1 }, { id: 'mat_ice_crystal', cnt: 1 }] },
        { result: 'acc_icequeen_ear_4', req: [{ id: 'acc_icequeen_ear_3', cnt: 1 }, { id: 'mat_ice_crystal', cnt: 1 }] },
        { result: 'acc_icequeen_ear_5', req: [{ id: 'acc_icequeen_ear_4', cnt: 1 }, { id: 'mat_ice_crystal', cnt: 1 }] },
        { result: 'acc_icequeen_ear_6', req: [{ id: 'acc_icequeen_ear_5', cnt: 1 }, { id: 'mat_ice_crystal', cnt: 1 }] },
        { result: 'acc_icequeen_ear_7', req: [{ id: 'acc_icequeen_ear_6', cnt: 1 }, { id: 'mat_ice_crystal', cnt: 1 }] },
        { result: 'acc_icequeen_ear_8_str', req: [{ id: 'acc_icequeen_ear_7', cnt: 1 }, { id: 'mat_ice_crystal', cnt: 1 }] },
        { result: 'acc_icequeen_ear_8_dex', req: [{ id: 'acc_icequeen_ear_7', cnt: 1 }, { id: 'mat_ice_crystal', cnt: 1 }] },
        { result: 'acc_icequeen_ear_8_int', req: [{ id: 'acc_icequeen_ear_7', cnt: 1 }, { id: 'mat_ice_crystal', cnt: 1 }] },
        { result: 'acc_icequeen_ear_8_con', req: [{ id: 'acc_icequeen_ear_7', cnt: 1 }, { id: 'mat_ice_crystal', cnt: 1 }] },
        { result: 'acc_icequeen_ear_8_wis', req: [{ id: 'acc_icequeen_ear_7', cnt: 1 }, { id: 'mat_ice_crystal', cnt: 1 }] },
        { result: 'acc_icequeen_ear_8_cha', req: [{ id: 'acc_icequeen_ear_7', cnt: 1 }, { id: 'mat_ice_crystal', cnt: 1 }] },
        // 💎 藍系（MP）：智慧→真實→支配
        { result: 'acc_ear_wisdom',   req: [{ id: 'new_item_160', cnt: 50 }, { id: 'new_item_161', cnt: 30 }, { id: 'new_item_162', cnt: 5 }, { id: 'new_item_151', cnt: 50 }] },
        { result: 'acc_ear_truth',    req: [{ id: 'acc_ear_wisdom', cnt: 1 }, { id: 'new_item_162', cnt: 10 }, { id: 'new_item_152', cnt: 30 }] },
        { result: 'acc_ear_dominate', req: [{ id: 'acc_ear_truth', cnt: 1 }, { id: 'new_item_162', cnt: 20 }, { id: 'new_item_153', cnt: 10 }] },
        // 💚 綠系（HP/MP）：憤怒→勇猛→不死
        { result: 'acc_ear_rage',     req: [{ id: 'new_item_154', cnt: 50 }, { id: 'new_item_155', cnt: 30 }, { id: 'new_item_156', cnt: 5 }, { id: 'new_item_151', cnt: 50 }] },
        { result: 'acc_ear_brave',    req: [{ id: 'acc_ear_rage', cnt: 1 }, { id: 'new_item_156', cnt: 10 }, { id: 'new_item_152', cnt: 30 }] },
        { result: 'acc_ear_undead',   req: [{ id: 'acc_ear_brave', cnt: 1 }, { id: 'new_item_156', cnt: 20 }, { id: 'new_item_153', cnt: 10 }] },
        // ❤️ 紅系（HP）：熱情→名譽→寬容
        { result: 'acc_ear_passion',  req: [{ id: 'new_item_157', cnt: 50 }, { id: 'new_item_158', cnt: 30 }, { id: 'new_item_159', cnt: 5 }, { id: 'new_item_151', cnt: 50 }] },
        { result: 'acc_ear_honor',    req: [{ id: 'acc_ear_passion', cnt: 1 }, { id: 'new_item_159', cnt: 10 }, { id: 'new_item_152', cnt: 30 }] },
        { result: 'acc_ear_tolerance',req: [{ id: 'acc_ear_honor', cnt: 1 }, { id: 'new_item_159', cnt: 20 }, { id: 'new_item_153', cnt: 10 }] }
    ],
    // 🔥 炎魔的輔佐官（炎魔謁見所·耳環製作）：靈魂石碎片逐階精煉；前7階無法強化、奴隸耳環可強化
    npc_flame_aide: [
        { result: 'acc_ear_dance',    req: [{ id: 'mat_soulstone_shard', cnt: 10 }] },
        { result: 'acc_ear_twin',     req: [{ id: 'acc_ear_dance', cnt: 1 }, { id: 'mat_soulstone_shard', cnt: 20 }] },
        { result: 'acc_ear_festival', req: [{ id: 'acc_ear_twin', cnt: 1 }, { id: 'mat_soulstone_shard', cnt: 40 }] },
        { result: 'acc_ear_peak',     req: [{ id: 'acc_ear_festival', cnt: 1 }, { id: 'mat_soulstone_shard', cnt: 200 }] },
        { result: 'acc_ear_rampage',  req: [{ id: 'acc_ear_peak', cnt: 1 }, { id: 'mat_soulstone_shard', cnt: 500 }] },
        { result: 'acc_ear_phantom',  req: [{ id: 'acc_ear_rampage', cnt: 1 }, { id: 'mat_soulstone_shard', cnt: 750 }] },
        { result: 'acc_ear_clan',     req: [{ id: 'acc_ear_phantom', cnt: 1 }, { id: 'mat_soulstone_shard', cnt: 1000 }] },
        { result: 'acc_ear_slave',    req: [{ id: 'acc_ear_clan', cnt: 1 }, { id: 'mat_soulstone_shard', cnt: 2500 }] }
    ],
    // 🔮 巴特爾（希培利亞村莊）：龜裂之核＝時空裂痕碎片×100；黑曜石奇古獸＝四種高品質寶石×10＋龜裂之核×2＋原石碎片×30＋精靈粉末×30＋金幣 100 萬
    npc_bartel: [
        { result: 'mat_crack_core', req: [{ id: 'mat_rift_shard', cnt: 100 }] },
        { result: 'item_osiris_box_basic', req: [{ id: 'mat_osiris_basic_up', cnt: 1 }, { id: 'mat_osiris_basic_down', cnt: 1 }] },
        { result: 'item_osiris_box_high', req: [{ id: 'mat_osiris_high_up', cnt: 1 }, { id: 'mat_osiris_high_down', cnt: 1 }] },
        { result: 'wpn_qigu_obsidian', req: [
            { id: 'new_item_153', cnt: 10 }, { id: 'new_item_159', cnt: 10 }, { id: 'new_item_162', cnt: 10 }, { id: 'new_item_156', cnt: 10 },
            { id: 'mat_crack_core', cnt: 2 }, { id: 'mat_rough_stone', cnt: 30 }, { id: 'new_item_170', cnt: 30 }, { id: 'gold', cnt: 1000000 }
        ] }
    ],
    // 🗼 烏普尼（亞丁）：支配符 = 傳送符×1 + 移動卷軸×100（11F~91F 共 9 組）
    npc_upni: [11, 21, 31, 41, 51, 61, 71, 81, 91].map(N => ({
        result: 'item_pride_dom_' + N,
        req: [{ id: 'item_pride_pass_' + N, cnt: 1 }, { id: 'item_pride_scroll_' + N, cnt: 100 }]
    })),
    // 🦴 諾斯（亞丁）：寵物裝備『之牙』鍛造
    npc_norse: [
        { result: 'pet_fang_hound',   req: [{ id: 'new_item_180', cnt: 50 },  { id: 'new_item_152', cnt: 3 },  { id: 'gold', cnt: 100000 }] },
        { result: 'pet_fang_steel',   req: [{ id: 'new_item_180', cnt: 100 }, { id: 'new_item_161', cnt: 1 },  { id: 'gold', cnt: 100000 }] },
        { result: 'pet_fang_ruin',    req: [{ id: 'pet_fang_hound', cnt: 1 }, { id: 'mat_black_mithril', cnt: 10 }, { id: 'new_phoenix_heart', cnt: 1 }, { id: 'gold', cnt: 1000000 }] },
        { result: 'pet_fang_victory', req: [{ id: 'pet_fang_steel', cnt: 1 }, { id: 'new_item_180', cnt: 50 }, { id: 'new_item_161', cnt: 2 }, { id: 'new_item_162', cnt: 1 }, { id: 'gold', cnt: 1000000 }] }
    ],
    // 🔥 炎魔之影（炎魔謁見所）：墮落鐮刀 + 墮落首級 → 炎魔的血光斗篷
    npc_flame_shadow: [
        { result: 'clk_flame_blood', req: [{ id: 'mat_fallen_scythe', cnt: 1 }, { id: 'mat_fallen_head', cnt: 1 }] }
    ],
    // 🔥 小惡魔（炎魔謁見所）：惡魔腳鐐 + 墮落素材 → 惡魔系列武器
    npc_imp: [
        { result: 'wpn_demon_sword', req: [{ id: 'mat_fallen_poison', cnt: 1 }, { id: 'mat_demon_anklet_black', cnt: 5 }, { id: 'mat_demon_anklet_red', cnt: 10 }, { id: 'mat_demon_anklet_blue', cnt: 5 }, { id: 'mat_demon_anklet_white', cnt: 5 }] },
        { result: 'wpn_demon_claw',  req: [{ id: 'mat_fallen_hand', cnt: 1 }, { id: 'mat_demon_anklet_black', cnt: 5 }, { id: 'mat_demon_anklet_red', cnt: 5 }, { id: 'mat_demon_anklet_blue', cnt: 5 }, { id: 'mat_demon_anklet_white', cnt: 10 }] },
        { result: 'wpn_demon_dual',  req: [{ id: 'mat_fallen_fang', cnt: 1 }, { id: 'mat_demon_anklet_black', cnt: 5 }, { id: 'mat_demon_anklet_red', cnt: 5 }, { id: 'mat_demon_anklet_blue', cnt: 10 }, { id: 'mat_demon_anklet_white', cnt: 5 }] },
        { result: 'wpn_demon_xbow',  req: [{ id: 'mat_fallen_tongue', cnt: 1 }, { id: 'mat_demon_anklet_black', cnt: 10 }, { id: 'mat_demon_anklet_red', cnt: 5 }, { id: 'mat_demon_anklet_blue', cnt: 5 }, { id: 'mat_demon_anklet_white', cnt: 5 }] }
    ],
    // 🔥 炎魔鐵匠（炎魔謁見所）：金屬板鍛造
    npc_flame_smith: [
        { result: 'mat_silver_plate', req: [{ id: 'mat_silver', cnt: 5 }, { id: 'new_item_180', cnt: 5 }, { id: 'gold', cnt: 1000 }] },
        { result: 'mat_blackmithril_plate', req: [{ id: 'mat_black_mithril', cnt: 10 }, { id: 'mat_silver_plate', cnt: 1 }, { id: 'new_item_177', cnt: 1 }, { id: 'new_item_178', cnt: 1 }, { id: 'gold', cnt: 10000 }] },
        { result: 'item_shadow_temple_key', req: [{ id: 'mat_soulstone_shard', cnt: 10 }, { id: 'gold', cnt: 1000000 }] }
    ],
    // 🗼 巴姆特（傲慢之塔入口）：詛咒的皮革 與 屬性斗篷
    npc_bamut: [
        { result: 'mat_cursed_leather_earth', req: [{ id: 'mat_chimera_snake', cnt: 5 }, { id: 'gold', cnt: 500 }] },
        { result: 'mat_cursed_leather_water', req: [{ id: 'mat_chimera_dragon', cnt: 5 }, { id: 'gold', cnt: 500 }] },
        { result: 'mat_cursed_leather_wind',  req: [{ id: 'mat_chimera_goat', cnt: 5 }, { id: 'gold', cnt: 500 }] },
        { result: 'mat_cursed_leather_fire',  req: [{ id: 'mat_chimera_lion', cnt: 5 }, { id: 'gold', cnt: 500 }] },
        { result: 'clk_pride_earth', req: [{ id: 'mat_cursed_leather_earth', cnt: 100 }, { id: 'new_item_191', cnt: 3 }, { id: 'new_item_151', cnt: 30 }, { id: 'new_item_174', cnt: 50 }, { id: 'gold', cnt: 100000 }] },
        { result: 'clk_pride_water', req: [{ id: 'mat_cursed_leather_water', cnt: 100 }, { id: 'new_item_190', cnt: 3 }, { id: 'new_item_154', cnt: 30 }, { id: 'new_item_174', cnt: 50 }, { id: 'gold', cnt: 100000 }] },
        { result: 'clk_pride_wind',  req: [{ id: 'mat_cursed_leather_wind', cnt: 100 }, { id: 'new_item_193', cnt: 3 }, { id: 'new_item_160', cnt: 30 }, { id: 'new_item_174', cnt: 50 }, { id: 'gold', cnt: 100000 }] },
        { result: 'clk_pride_fire',  req: [{ id: 'mat_cursed_leather_fire', cnt: 100 }, { id: 'new_item_192', cnt: 3 }, { id: 'new_item_157', cnt: 30 }, { id: 'new_item_174', cnt: 50 }, { id: 'gold', cnt: 100000 }] }
    ],
    npc_tas: [
        { result: 'panacea_str', req: [{ id: 'panacea_white', cnt: 3 }] },
        { result: 'panacea_dex', req: [{ id: 'panacea_white', cnt: 3 }] },
        { result: 'panacea_int', req: [{ id: 'panacea_white', cnt: 3 }] },
        { result: 'panacea_con', req: [{ id: 'panacea_white', cnt: 3 }] },
        { result: 'panacea_wis', req: [{ id: 'panacea_white', cnt: 3 }] },
        { result: 'panacea_cha', req: [{ id: 'panacea_white', cnt: 3 }] }
    ],
    'npc_moli': [
        {
            result: 'arm_48', // 皮帽子
            req: [{ id: 'new_item_180', cnt: 1 }, { id: 'new_item_179', cnt: 5 }]
        },
        {
            result: 'arm_111', // 皮盾牌
            req: [{ id: 'new_item_179', cnt: 7 }]
        },
        {
            result: 'arm_91', // 皮涼鞋
            req: [{ id: 'new_item_180', cnt: 2 }, { id: 'new_item_179', cnt: 6 }]
        },
        {
            result: 'arm_75', // 皮背心
            req: [{ id: 'new_item_179', cnt: 10 }]
        },
        {
            result: 'arm_49', // 皮頭盔
            req: [
                { id: 'arm_48', cnt: 1 }, { id: 'arm_42', cnt: 1 }, 
                { id: 'new_item_182', cnt: 5 }, { id: 'new_item_180', cnt: 5 }
            ]
        },
        {
            result: 'arm_78', // 硬皮背心
            req: [
                { id: 'arm_77', cnt: 1 }, { id: 'new_item_182', cnt: 15 }, 
                { id: 'new_item_180', cnt: 15 }
            ]
        },
        {
            result: 'new_item_181', // 皮帶
            req: [{ id: 'new_item_182', cnt: 5 }, { id: 'new_item_180', cnt: 2 }]
        },
        {
            result: 'arm_76', // 皮盔甲
            req: [{ id: 'arm_75', cnt: 1 }, { id: 'new_item_181', cnt: 1 }]
        },
        {
            result: 'arm_93', // 皮長靴
            req: [
                { id: 'arm_92', cnt: 1 }, { id: 'new_item_182', cnt: 10 }, 
                { id: 'new_item_180', cnt: 10 }, { id: 'gold', cnt: 300 } // 👈 支援金幣需求
            ]
        },
        {
            result: 'new_item_182', // 高級皮革
            req: [{ id: 'new_item_179', cnt: 20 }]
        }
    ],
// 👇 新增布拉伯的配方區塊
    'npc_brabo': [
        {
            result: 'wpn_40', // 覆上米索莉的角
            req: [{ id: 'wpn_39', cnt: 2 }, { id: 'new_item_169', cnt: 80 }]
        },
        {
            result: 'wpn_41', // 覆上奧里哈魯根的角
            req: [{ id: 'wpn_39', cnt: 4 }, { id: 'new_item_173', cnt: 80 }, { id: 'new_item_157', cnt: 3 }]
        },
        {
            result: 'wpn_34', // 短劍的劍身
            req: [{ id: 'new_item_elfwing', cnt: 1 }, { id: 'new_item_169', cnt: 50 }]
        },
        {
            result: 'wpn_35', // 長劍的劍身
            req: [{ id: 'new_item_elfwing', cnt: 3 }, { id: 'new_item_169', cnt: 150 }]
        },
        {
            result: 'wpn_36', // 奧里哈魯根的劍身
            req: [{ id: 'new_item_elfwing', cnt: 3 }, { id: 'new_item_157', cnt: 3 }, { id: 'new_item_173', cnt: 150 }]
        }
    ],
// 👇 新增芬與法林的配方區塊
    'npc_finn': [
        { result: 'hlm_silver', req: [{ id: 'arm_48', cnt: 1 }, { id: 'new_item_182', cnt: 2 }, { id: 'new_item_180', cnt: 10 }] },
        { result: 'arm_112', req: [{ id: 'arm_111', cnt: 1 }, { id: 'new_item_182', cnt: 5 }, { id: 'new_item_180', cnt: 20 }] },
        { result: 'arm_92', req: [{ id: 'arm_91', cnt: 1 }, { id: 'new_item_182', cnt: 3 }, { id: 'new_item_180', cnt: 12 }] },
        { result: 'arm_77', req: [{ id: 'arm_75', cnt: 1 }, { id: 'new_item_182', cnt: 2 }, { id: 'new_item_180', cnt: 10 }] }
    ],
    'npc_falin': [
        { result: 'hlm_silver', req: [{ id: 'arm_48', cnt: 1 }, { id: 'new_item_182', cnt: 2 }, { id: 'new_item_180', cnt: 10 }] },
        { result: 'arm_112', req: [{ id: 'arm_111', cnt: 1 }, { id: 'new_item_182', cnt: 5 }, { id: 'new_item_180', cnt: 20 }] },
        { result: 'arm_92', req: [{ id: 'arm_91', cnt: 1 }, { id: 'new_item_182', cnt: 3 }, { id: 'new_item_180', cnt: 12 }] },
        { result: 'arm_77', req: [{ id: 'arm_75', cnt: 1 }, { id: 'new_item_182', cnt: 2 }, { id: 'new_item_180', cnt: 10 }] }
    ],
// (接在 npc_falin 區塊的下方)
    // 👇 新增喬爾與萊恩的配方區塊
    'npc_joel': [
        { result: 'shd_bone', req: [{ id: 'arm_112', cnt: 1 }, { id: 'new_item_183', cnt: 15 }, { id: 'gold', cnt: 800 }] },
        { result: 'amr_bone', req: [{ id: 'arm_78', cnt: 1 }, { id: 'new_item_183', cnt: 20 }, { id: 'gold', cnt: 500 }] },
        { result: 'hlm_bone', req: [{ id: 'arm_49', cnt: 1 }, { id: 'new_item_183', cnt: 10 }, { id: 'gold', cnt: 800 }] }
    ],
    'npc_ryan': [
        { result: 'shd_bone', req: [{ id: 'arm_112', cnt: 1 }, { id: 'new_item_183', cnt: 15 }, { id: 'gold', cnt: 800 }] },
        { result: 'amr_bone', req: [{ id: 'arm_78', cnt: 1 }, { id: 'new_item_183', cnt: 20 }, { id: 'gold', cnt: 500 }] },
        { result: 'hlm_bone', req: [{ id: 'arm_49', cnt: 1 }, { id: 'new_item_183', cnt: 10 }, { id: 'gold', cnt: 800 }] }
    ],
// 👇 新增妖精森林全系列配方
    'npc_nalien': [
        { result: 'new_item_176', req: [{ id: 'new_item_172', cnt: 1 }, { id: 'new_item_173', cnt: 10 }] }
    ],
    'npc_rekne': [
        { result: 'new_item_168', req: [{ id: 'new_item_163', cnt: 1 }] },
        { result: 'new_item_174', req: [{ id: 'new_item_168', cnt: 1 }, { id: 'new_item_169', cnt: 5 }] },
        { result: 'new_item_171', req: [{ id: 'new_item_237', cnt: 2 }] },
        { result: 'new_item_175', req: [{ id: 'new_item_172', cnt: 3 }] }
    ],
    'npc_narupa': [
        { result: 'wpn_15', req: [{ id: 'wpn_34', cnt: 1 }, { id: 'new_item_237', cnt: 10 }, { id: 'new_item_169', cnt: 90 }, { id: 'new_item_171', cnt: 10 }] },
        { result: 'arm_70', req: [{ id: 'new_item_172', cnt: 2 }, { id: 'new_item_163', cnt: 5 }] },
        { result: 'arm_74', req: [{ id: 'new_item_237', cnt: 10 }, { id: 'new_item_168', cnt: 6 }] },
        { result: 'arm_109', req: [{ id: 'new_item_172', cnt: 1 }, { id: 'new_item_237', cnt: 5 }, { id: 'new_item_171', cnt: 5 }] },
        { result: 'wpn_rapier', req: [{ id: 'wpn_36', cnt: 1 }, { id: 'new_item_elfwing', cnt: 2 }, { id: 'new_item_171', cnt: 25 }, { id: 'new_item_173', cnt: 50 }, { id: 'new_item_158', cnt: 1 }] },
        { result: 'wpn_mailbreaker', req: [{ id: 'wpn_34', cnt: 1 }, { id: 'wpn_40', cnt: 1 }, { id: 'new_item_237', cnt: 10 }, { id: 'new_item_171', cnt: 50 }, { id: 'new_item_151', cnt: 1 }] },
        { result: 'wpn_10', req: [{ id: 'new_item_237', cnt: 10 }, { id: 'new_item_171', cnt: 5 }] },
        { result: 'wpn_30', yield: 10, req: [{ id: 'new_item_237', cnt: 1 }, { id: 'new_item_169', cnt: 1 }] }, // 產出 10
        { result: 'arm_90', req: [{ id: 'new_item_175', cnt: 2 }, { id: 'new_item_168', cnt: 10 }] },
        { result: 'arm_44', req: [{ id: 'hlm_elf', cnt: 1 }, { id: 'new_item_178', cnt: 3 }, { id: 'new_item_174', cnt: 150 }, { id: 'new_item_150', cnt: 5 }, { id: 'new_item_161', cnt: 1 }, { id: 'new_item_155', cnt: 1 }, { id: 'new_item_152', cnt: 1 }] },
        { result: 'hlm_elf', req: [{ id: 'new_item_172', cnt: 2 }, { id: 'new_item_elfwing', cnt: 1 }, { id: 'new_item_163', cnt: 10 }, { id: 'new_item_171', cnt: 20 }] },
        { result: 'wpn_elfsword', req: [{ id: 'wpn_35', cnt: 1 }, { id: 'new_item_237', cnt: 5 }, { id: 'new_item_169', cnt: 150 }, { id: 'new_item_171', cnt: 50 }] },
        { result: 'wpn_dagger2', req: [{ id: 'new_item_237', cnt: 1 }, { id: 'new_item_164', cnt: 1 }] },
        { result: 'clk_elf', req: [{ id: 'new_item_174', cnt: 10 }, { id: 'new_item_150', cnt: 2 }, { id: 'new_item_165', cnt: 6 }] },
        { result: 'shd_elf', req: [{ id: 'arm_109', cnt: 1 }, { id: 'new_item_177', cnt: 2 }, { id: 'new_item_171', cnt: 5 }] },
        { result: 'arm_73', req: [{ id: 'new_item_177', cnt: 4 }, { id: 'new_item_174', cnt: 10 }] },
        { result: 'wpn_24', req: [{ id: 'wpn_40', cnt: 1 }, { id: 'new_item_237', cnt: 10 }, { id: 'new_item_171', cnt: 30 }] },
        { result: 'arm_72', req: [{ id: 'new_item_178', cnt: 8 }, { id: 'new_item_174', cnt: 20 }, { id: 'new_item_153', cnt: 1 }] },
        { result: 'wpn_elfbow', req: [{ id: 'new_item_237', cnt: 10 }, { id: 'new_item_164', cnt: 1 }, { id: 'new_item_175', cnt: 2 }, { id: 'new_item_168', cnt: 2 }] },
        { result: 'arm_71', req: [{ id: 'new_item_175', cnt: 2 }, { id: 'new_item_168', cnt: 10 }] },
        { result: 'wpn_29', req: [{ id: 'new_item_178', cnt: 6 }, { id: 'wpn_41', cnt: 1 }, { id: 'new_item_174', cnt: 40 }, { id: 'new_item_175', cnt: 5 }, { id: 'new_item_155', cnt: 2 }, { id: 'new_item_152', cnt: 1 }] },
        { result: 'wpn_battleaxe', req: [{ id: 'wpn_34', cnt: 1 }, { id: 'new_item_237', cnt: 10 }, { id: 'new_item_164', cnt: 3 }, { id: 'new_item_171', cnt: 5 }] },
        { result: 'bot_short', req: [{ id: 'new_item_172', cnt: 2 }, { id: 'new_item_168', cnt: 4 }] },
        { result: 'wpn_31', req: [{ id: 'new_item_178', cnt: 3 }, { id: 'new_item_elfwing', cnt: 8 }, { id: 'new_item_174', cnt: 20 }, { id: 'new_item_171', cnt: 30 }] },
        { result: 'arm_99', req: [{ id: 'new_item_174', cnt: 20 }, { id: 'new_item_175', cnt: 5 }, { id: 'new_item_152', cnt: 1 }, { id: 'new_item_167', cnt: 1 }] },
        { result: 'wpn_halberd', req: [{ id: 'wpn_24', cnt: 1 }, { id: 'wpn_41', cnt: 1 }, { id: 'new_item_173', cnt: 60 }, { id: 'new_item_171', cnt: 50 }, { id: 'new_item_158', cnt: 1 }] },
        { result: 'wpn_5', yield: 100, req: [{ id: 'new_item_237', cnt: 10 }] }, // 產出 100
        { result: 'wpn_3', req: [{ id: 'new_item_237', cnt: 1 }, { id: 'new_item_168', cnt: 5 }] },
        { result: 'arm_98', req: [{ id: 'new_item_172', cnt: 3 }, { id: 'new_item_174', cnt: 20 }] }
    ],
    'npc_elfqueen': [
        { result: 'new_item_173', req: [{ id: 'new_item_169', cnt: 10 }] },
        { result: 'wpn_shaha_bow', req: [{ id: 'wpn_29', cnt: 1 }, { id: 'mat_griffon_feather', cnt: 30 }, { id: 'item_wind_tear', cnt: 50 }, { id: 'new_item_193', cnt: 15 }] }
    ],
    'npc_elf': [
        { result: 'new_item_169', yield: 20, req: [{ id: 'new_item_164', cnt: 1 }] }, // 產出 20
        { result: 'new_item_170', yield: 20, req: [{ id: 'new_item_165', cnt: 1 }] }, // 產出 20
        { result: 'new_item_elfwing', req: [{ id: 'new_item_174', cnt: 5 }, { id: 'new_item_165', cnt: 2 }] }
    ],
    'npc_ent': [
        { result: 'new_item_172', req: [{ id: 'new_item_166', cnt: 1 }] }
    ],
    'npc_pan': [
        { result: 'new_item_177', req: [{ id: 'new_item_169', cnt: 50 }, { id: 'new_item_175', cnt: 1 }] },
        { result: 'new_item_178', req: [{ id: 'new_item_173', cnt: 30 }, { id: 'new_item_175', cnt: 1 }] },
        { result: 'wpn_39', req: [{ id: 'new_item_176', cnt: 1 }] }
    ],
// 👇 新增羅賓孫的配方（妖精森林：熾炎天使弓）
    'npc_robinson': [
        { result: 'wpn_flaming_angel', req: [
            { id: 'mat_unicorn_horn', cnt: 4 },
            { id: 'mat_wind_breath', cnt: 30 },
            { id: 'mat_water_breath', cnt: 30 },
            { id: 'mat_fire_breath', cnt: 30 },
            { id: 'mat_earth_breath', cnt: 30 },
            { id: 'mat_griffon_feather', cnt: 30 },
            { id: 'new_item_152', cnt: 10 },   // 品質鑽石
            { id: 'new_item_158', cnt: 10 },   // 品質紅寶石
            { id: 'new_item_161', cnt: 10 },   // 品質藍寶石
            { id: 'new_item_155', cnt: 10 },   // 品質綠寶石
            { id: 'new_item_153', cnt: 1 },    // 高品質鑽石
            { id: 'new_item_159', cnt: 1 },    // 高品質紅寶石
            { id: 'new_item_162', cnt: 1 },    // 高品質藍寶石
            { id: 'new_item_156', cnt: 1 },    // 高品質綠寶石
            { id: 'new_item_195', cnt: 1000 }  // 精靈玉
        ] }
    ],
// 👇 新增庫普的配方（沉默洞穴：銀與黑暗妖精鋼爪/雙刀/十字弓；武器皆支援席琳製作）
    'npc_kupu': [
        { result: 'mat_silver',      req: [{ id: 'mat_silverore', cnt: 10 }, { id: 'gold', cnt: 500 }] },
        { result: 'wpn_claw_dark',   req: [{ id: 'new_item_182', cnt: 10 }, { id: 'new_item_180', cnt: 10 }, { id: 'mat_blackstone3', cnt: 5 }, { id: 'mat_blackstone2', cnt: 100 }] },
        { result: 'wpn_claw_silver', req: [{ id: 'wpn_claw_dark', cnt: 1 }, { id: 'new_item_182', cnt: 10 }, { id: 'mat_silver', cnt: 30 }, { id: 'new_item_180', cnt: 10 }, { id: 'mat_blackstone4', cnt: 1 }, { id: 'mat_blackstone2', cnt: 40 }, { id: 'new_item_151', cnt: 1 }] },
        { result: 'wpn_claw_gloom',  req: [{ id: 'wpn_claw_dark', cnt: 1 }, { id: 'new_item_182', cnt: 10 }, { id: 'new_item_180', cnt: 10 }, { id: 'mat_blackstone4', cnt: 10 }, { id: 'mat_blackstone3', cnt: 100 }] },
        { result: 'wpn_dual_dark',   req: [{ id: 'new_item_182', cnt: 20 }, { id: 'new_item_180', cnt: 10 }, { id: 'mat_blackstone2', cnt: 100 }] },
        { result: 'wpn_dual_silver', req: [{ id: 'wpn_dual_dark', cnt: 1 }, { id: 'new_item_182', cnt: 20 }, { id: 'mat_silver', cnt: 20 }, { id: 'new_item_180', cnt: 10 }, { id: 'mat_blackstone4', cnt: 1 }, { id: 'mat_blackstone2', cnt: 50 }, { id: 'new_item_151', cnt: 1 }] },
        { result: 'wpn_dual_gloom',  req: [{ id: 'wpn_dual_dark', cnt: 1 }, { id: 'new_item_182', cnt: 20 }, { id: 'new_item_180', cnt: 10 }, { id: 'mat_blackstone4', cnt: 5 }, { id: 'mat_blackstone3', cnt: 100 }] },
        { result: 'wpn_xbow_dark',   req: [{ id: 'new_item_182', cnt: 30 }, { id: 'new_item_180', cnt: 10 }, { id: 'mat_blackstone3', cnt: 10 }, { id: 'mat_blackstone2', cnt: 100 }] },
        { result: 'wpn_xbow_gloom',  req: [{ id: 'wpn_xbow_dark', cnt: 1 }, { id: 'new_item_182', cnt: 30 }, { id: 'new_item_180', cnt: 10 }, { id: 'mat_blackstone4', cnt: 20 }, { id: 'mat_blackstone3', cnt: 100 }] }
    ],
// 👇 新增奇岩製作 NPC 的配方
    'npc_moliya': [
        { result: 'hlm_mage', req: [{ id: 'new_item_189', cnt: 1 }, { id: 'new_item_188', cnt: 1 }, { id: 'new_item_187', cnt: 1 }, { id: 'new_item_150', cnt: 20 }, { id: 'new_item_155', cnt: 2 }] },
        { result: 'amr_magerobe', req: [{ id: 'new_item_189', cnt: 2 }, { id: 'new_item_162', cnt: 1 }, { id: 'new_item_187', cnt: 4 }, { id: 'new_item_150', cnt: 25 }] }
    ],
    'npc_hector': [
        { result: 'hlm_steel', req: [{ id: 'arm_43', cnt: 1 }, { id: 'new_item_180', cnt: 120 }, { id: 'gold', cnt: 16500 }] },
        { result: 'arm_113', req: [{ id: 'arm_108', cnt: 1 }, { id: 'new_item_180', cnt: 200 }, { id: 'gold', cnt: 16000 }] },
        { result: 'arm_94', req: [{ id: 'arm_90', cnt: 1 }, { id: 'new_item_180', cnt: 160 }, { id: 'gold', cnt: 8000 }] },
        { result: 'arm_100', req: [{ id: 'glv_glove', cnt: 1 }, { id: 'new_item_180', cnt: 150 }, { id: 'gold', cnt: 25000 }] },
        { result: 'arm_79', req: [{ id: 'amr_plate', cnt: 1 }, { id: 'new_item_180', cnt: 450 }, { id: 'gold', cnt: 30000 }] },
        { result: 'hlm_frost', req: [{ id: 'hlm_icequeen_charm', cnt: 1 }, { id: 'arm_43', cnt: 1 }, { id: 'gold', cnt: 50000 }] },
        { result: 'amr_frost', req: [{ id: 'amr_icequeen_charm', cnt: 1 }, { id: 'amr_plate', cnt: 1 }, { id: 'gold', cnt: 50000 }] },
        { result: 'bot_frost', req: [{ id: 'bot_icequeen_charm', cnt: 1 }, { id: 'arm_90', cnt: 1 }, { id: 'gold', cnt: 50000 }] }
    ],
    'npc_herbert': [
        { result: 'clk_mr', req: [{ id: 'new_item_189', cnt: 1 }, { id: 'new_item_188', cnt: 10 }, { id: 'new_item_187', cnt: 2 }, { id: 'gold', cnt: 1000 }] },
        { result: 'arm_87', req: [{ id: 'new_item_189', cnt: 10 }, { id: 'new_item_188', cnt: 5 }, { id: 'new_item_187', cnt: 5 }, { id: 'gold', cnt: 20000 }] },
        { result: 'tsh_tshirt', req: [{ id: 'new_item_189', cnt: 10 }, { id: 'new_item_188', cnt: 3 }, { id: 'new_item_187', cnt: 2 }, { id: 'gold', cnt: 30000 }] }
    ],
// 👇 新增海音與歐瑞製作 NPC 的配方
    'npc_lumiel': [
        { result: 'acc_135', req: [{ id: 'blt_body', cnt: 1 }, { id: 'new_item_221', cnt: 50 }, { id: 'new_item_158', cnt: 20 }, { id: 'new_item_161', cnt: 20 }, { id: 'new_item_155', cnt: 20 }, { id: 'new_item_152', cnt: 20 }, { id: 'gold', cnt: 100000 }] },
        { result: 'acc_137', req: [{ id: 'acc_131', cnt: 1 }, { id: 'new_item_221', cnt: 50 }, { id: 'new_item_158', cnt: 20 }, { id: 'new_item_161', cnt: 20 }, { id: 'new_item_155', cnt: 20 }, { id: 'new_item_152', cnt: 20 }, { id: 'gold', cnt: 100000 }] },
        { result: 'acc_136', req: [{ id: 'acc_130', cnt: 1 }, { id: 'new_item_221', cnt: 50 }, { id: 'new_item_158', cnt: 20 }, { id: 'new_item_161', cnt: 20 }, { id: 'new_item_155', cnt: 20 }, { id: 'new_item_152', cnt: 20 }, { id: 'gold', cnt: 100000 }] },
        { result: 'arm_95', req: [{ id: 'arm_90', cnt: 1 }, { id: 'new_item_221', cnt: 30 }, { id: 'new_item_mermaid_scale', cnt: 30 }] },
        { result: 'blt_body', req: [{ id: 'acc_127', cnt: 1 }, { id: 'new_item_221', cnt: 20 }, { id: 'new_item_157', cnt: 30 }, { id: 'new_item_160', cnt: 30 }, { id: 'new_item_154', cnt: 30 }, { id: 'new_item_151', cnt: 30 }, { id: 'gold', cnt: 50000 }] },
        { result: 'acc_131', req: [{ id: 'acc_129', cnt: 1 }, { id: 'new_item_221', cnt: 20 }, { id: 'new_item_157', cnt: 30 }, { id: 'new_item_160', cnt: 30 }, { id: 'new_item_154', cnt: 30 }, { id: 'new_item_151', cnt: 30 }, { id: 'gold', cnt: 50000 }] },
        { result: 'acc_130', req: [{ id: 'acc_128', cnt: 1 }, { id: 'new_item_221', cnt: 20 }, { id: 'new_item_157', cnt: 30 }, { id: 'new_item_160', cnt: 30 }, { id: 'new_item_154', cnt: 30 }, { id: 'new_item_151', cnt: 30 }, { id: 'gold', cnt: 50000 }] },
        { result: 'arm_107', req: [{ id: 'arm_108', cnt: 1 }, { id: 'new_item_mermaid_scale', cnt: 100 }, { id: 'new_item_190', cnt: 10 }] }
    ],
    'npc_ibelbin': [
        { result: 'wpn_siruge', req: [{ id: 'new_item_194', cnt: 300 }, { id: 'new_item_173', cnt: 500 }, { id: 'new_item_159', cnt: 5 }, { id: 'new_item_162', cnt: 5 }, { id: 'new_item_156', cnt: 5 }, { id: 'new_item_153', cnt: 5 }, { id: 'new_item_192', cnt: 3 }] },
        { result: 'arm_80', req: [{ id: 'new_item_194', cnt: 150 }, { id: 'new_item_173', cnt: 1000 }, { id: 'new_item_159', cnt: 3 }, { id: 'new_item_162', cnt: 3 }, { id: 'new_item_156', cnt: 3 }, { id: 'new_item_153', cnt: 3 }, { id: 'new_item_174', cnt: 500 }, { id: 'new_item_190', cnt: 15 }] },
        { result: 'arm_82', req: [{ id: 'new_item_194', cnt: 150 }, { id: 'new_item_173', cnt: 1000 }, { id: 'new_item_159', cnt: 3 }, { id: 'new_item_162', cnt: 3 }, { id: 'new_item_156', cnt: 3 }, { id: 'new_item_153', cnt: 3 }, { id: 'new_item_174', cnt: 500 }, { id: 'new_item_192', cnt: 15 }] },
        { result: 'arm_81', req: [{ id: 'new_item_194', cnt: 150 }, { id: 'new_item_173', cnt: 1000 }, { id: 'new_item_159', cnt: 3 }, { id: 'new_item_162', cnt: 3 }, { id: 'new_item_156', cnt: 3 }, { id: 'new_item_153', cnt: 3 }, { id: 'new_item_174', cnt: 500 }, { id: 'new_item_191', cnt: 15 }] },
        { result: 'arm_83', req: [{ id: 'new_item_194', cnt: 150 }, { id: 'new_item_173', cnt: 1000 }, { id: 'new_item_159', cnt: 3 }, { id: 'new_item_162', cnt: 3 }, { id: 'new_item_156', cnt: 3 }, { id: 'new_item_153', cnt: 3 }, { id: 'new_item_174', cnt: 500 }, { id: 'new_item_193', cnt: 15 }] }
    ],
    // 👇 奇岩・倫提斯：四屬性精靈戒指（四軍團印記各×10 ＋ 對應軍王徽印×1）
    'npc_lentis': [
        { result: 'rng_earth', req: [{ id: 'mat_legion_necro', cnt: 10 }, { id: 'mat_legion_law', cnt: 10 }, { id: 'mat_legion_beast', cnt: 10 }, { id: 'mat_legion_assassin', cnt: 10 }, { id: 'mat_crest_beast', cnt: 1 }] },
        { result: 'rng_water', req: [{ id: 'mat_legion_necro', cnt: 10 }, { id: 'mat_legion_law', cnt: 10 }, { id: 'mat_legion_beast', cnt: 10 }, { id: 'mat_legion_assassin', cnt: 10 }, { id: 'mat_crest_law', cnt: 1 }] },
        { result: 'rng_wind', req: [{ id: 'mat_legion_necro', cnt: 10 }, { id: 'mat_legion_law', cnt: 10 }, { id: 'mat_legion_beast', cnt: 10 }, { id: 'mat_legion_assassin', cnt: 10 }, { id: 'mat_crest_assassin', cnt: 1 }] },
        { result: 'rng_fire', req: [{ id: 'mat_legion_necro', cnt: 10 }, { id: 'mat_legion_law', cnt: 10 }, { id: 'mat_legion_beast', cnt: 10 }, { id: 'mat_legion_assassin', cnt: 10 }, { id: 'mat_crest_necro', cnt: 1 }] }
    ],
    // 🏛️ 威頓村・客盧亞：古代神之槍／斧（古代臂甲×2 已改由貝希摩斯・皮爾製作）
    'npc_zeus_golem': [
        { result: 'wpn_demon_axehead', req: [{ id: 'wpn_demon_axe', cnt: 1 }, { id: 'mat_blackmithril_plate', cnt: 5 }] }
    ],
    // 👑 拉比安尼（說話之島）：王族特殊級魔法書＝飛龍之心＋高崙之心＋冰之女王之心＋不死鳥之心 各1
    'npc_rabiani': [
        { result: 'bk_royal_burnweapon', req: [{ id: 'mat_dragon_heart', cnt: 1 }, { id: 'mat_golem_heart', cnt: 1 }, { id: 'mat_icequeen_heart', cnt: 1 }, { id: 'new_phoenix_heart', cnt: 1 }] },
        { result: 'bk_royal_bravewill',  req: [{ id: 'mat_dragon_heart', cnt: 1 }, { id: 'mat_golem_heart', cnt: 1 }, { id: 'mat_icequeen_heart', cnt: 1 }, { id: 'new_phoenix_heart', cnt: 1 }] },
        { result: 'bk_royal_shield',     req: [{ id: 'mat_dragon_heart', cnt: 1 }, { id: 'mat_golem_heart', cnt: 1 }, { id: 'mat_icequeen_heart', cnt: 1 }, { id: 'new_phoenix_heart', cnt: 1 }] },
        { result: 'bk_royal_kingguard',  req: [{ id: 'mat_dragon_heart', cnt: 1 }, { id: 'mat_golem_heart', cnt: 1 }, { id: 'mat_icequeen_heart', cnt: 1 }, { id: 'new_phoenix_heart', cnt: 1 }] }
    ],
    'npc_keluya': [
        { result: 'wpn_ancient_spear', req: [{ id: 'item_unknown_spear', cnt: 1 }, { id: 'item_ancient_scroll', cnt: 10 }, { id: 'new_item_153', cnt: 10 }, { id: 'new_phoenix_heart', cnt: 1 }, { id: 'new_item_178', cnt: 50 }, { id: 'mat_soulstone_shard', cnt: 500 }] },
        { result: 'wpn_ancient_axe', req: [{ id: 'mat_unknown_axe', cnt: 1 }, { id: 'item_ancient_scroll', cnt: 10 }, { id: 'new_item_159', cnt: 10 }, { id: 'new_phoenix_heart', cnt: 1 }, { id: 'new_item_177', cnt: 50 }, { id: 'mat_soulstone_shard', cnt: 500 }] }
    ],
    // 🐉 貝希摩斯・皮爾：破滅者鎖鏈劍 ＋ 古代臂甲（×2，自客盧亞移交）
    'npc_pir': [
        { result: 'wpn_chain_destroyer', req: [{ id: 'item_forgotten_greatsword', cnt: 1 }, { id: 'new_item_171', cnt: 20 }, { id: 'new_item_182', cnt: 20 }, { id: 'new_item_192', cnt: 1 }, { id: 'gold', cnt: 1000000 }] },
        { result: 'armguard_archer', req: [{ id: 'item_forgotten_leather', cnt: 1 }, { id: 'new_item_175', cnt: 20 }, { id: 'new_item_172', cnt: 50 }, { id: 'mat_blackmithril_plate', cnt: 3 }, { id: 'new_item_174', cnt: 50 }, { id: 'new_item_elfwing', cnt: 20 }] },
        { result: 'armguard_fighter', req: [{ id: 'item_forgotten_plate', cnt: 1 }, { id: 'mat_blackmithril_plate', cnt: 5 }, { id: 'new_item_174', cnt: 50 }, { id: 'gold', cnt: 1000000 }] }
    ],
    // 🏛️ 象牙塔・迪泰特（解除封印）：受封印 被遺忘的裝備 ＋ 古代的卷軸 → 古老系列（成品為武器/盔甲，自動提供「席琳製作」）
    'npc_dytite': [
        { result: 'wpn_old_sword', req: [{ id: 'item_forgotten_sword', cnt: 1 }, { id: 'item_ancient_scroll', cnt: 1 }] },
        { result: 'wpn_old_greatsword', req: [{ id: 'item_forgotten_greatsword', cnt: 1 }, { id: 'item_ancient_scroll', cnt: 1 }] },
        { result: 'wpn_old_xbow', req: [{ id: 'item_forgotten_xbow', cnt: 1 }, { id: 'item_ancient_scroll', cnt: 1 }] },
        { result: 'amr_old_scale', req: [{ id: 'item_forgotten_scale', cnt: 1 }, { id: 'item_ancient_scroll', cnt: 1 }] },
        { result: 'amr_old_leather', req: [{ id: 'item_forgotten_leather', cnt: 1 }, { id: 'item_ancient_scroll', cnt: 1 }] },
        { result: 'amr_old_robe', req: [{ id: 'item_forgotten_robe', cnt: 1 }, { id: 'item_ancient_scroll', cnt: 1 }] },
        { result: 'amr_old_plate', req: [{ id: 'item_forgotten_plate', cnt: 1 }, { id: 'item_ancient_scroll', cnt: 1 }] }
    ]
};

// 製作數量選擇器 + 製作按鈕（預設數量 1）
function craftActionHtml(npcId, idx) {
    // 🔮 席琳製作：成品為 武器/頭盔/盔甲/手套/長靴/斗篷/腰帶 時，於「製作」旁多一顆按鈕
    //（消耗相同材料＋每件 1 個席琳結晶，成品必定附帶隨機席琳套裝效果；其餘詞綴機率照舊）
    let _r = CRAFT_RECIPES[npcId] && CRAFT_RECIPES[npcId][idx];
    let _rd = _r && DB.items[_r.result];
    let _shOk = _rd && !player.classicMode && ((_rd.type === 'wpn' && !_rd.isArrow)
        || (_rd.type === 'arm' && ['helm','armor','gloves','boots','cloak'].includes(_rd.slot))
        || ((_rd.type === 'acc' || _rd.type === 'arm') && _rd.slot === 'belt'));   // 🔮 項鍊已改為腰帶
    let _shBtn = _shOk ? `<button class="btn bg-green-900 hover:bg-green-800 border-green-600 py-2 px-3 font-bold shadow" onclick="doCraft('${npcId}', ${idx}, true)" title="消耗相同材料＋每件 1 個席琳結晶：成品必定附帶一種席琳套裝效果"><span class="c-sherine">席琳製作</span></button>` : '';
    return `<div class="flex items-center gap-2 shrink-0">
        <input type="number" min="1" value="1" id="craft-qty-${npcId}-${idx}" onclick="event.stopPropagation()" class="w-14 px-1 py-2 bg-slate-900 border border-slate-600 rounded text-center text-white font-bold">
        <button class="btn bg-blue-700 hover:bg-blue-600 border-blue-500 py-2 px-6 font-bold shadow" onclick="doCraft('${npcId}', ${idx})">製作</button>
        ${_shBtn}
    </div>`;
}

function renderUniversalCraft(div, npcId) {
    let recipes = CRAFT_RECIPES[npcId];
    if (!recipes) return;
    if (!RECIPE_BY_RESULT) buildRecipeIndex();
    let html = '';
    
    recipes.forEach((r, idx) => {
        let resItem = DB.items[r.result];
        let outCnt = r.yield || 1;
        // 如果產出大於 1，就在名稱後面標示數量 (例如: 箭 (x100))
        let resName = resItem.n + (outCnt > 1 ? ` <span class="text-yellow-400 text-sm">(x${outCnt})</span>` : '');
        
        let reqHtml = craftReqHtml(r.req);

        let imgUrl = getIconUrl(resItem);
        
        html += `
        <div class="list-item bg-slate-800 rounded mb-2 border border-slate-700 p-3 hover:bg-slate-700 transition-colors" style="display:flex !important; justify-content:space-between !important; align-items:center !important; width:100% !important; box-sizing:border-box !important;">
            <div class="flex items-center gap-4 min-w-0 flex-1">
                <div class="w-12 h-12 bg-slate-900 rounded border border-slate-600 flex items-center justify-center shrink-0 tip-host">
                    <img src="${imgUrl}" onerror="this.style.display='none';" class="w-10 h-10 object-contain pointer-events-none">
                </div>
                <div class="flex flex-col items-start gap-1.5">
                    <span class="${getItemColor({ id: r.result })} font-bold text-lg leading-none truncate">${resName}</span>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-slate-400 text-sm">需求：</span>${reqHtml}
                    </div>
                </div>
            </div>
            ${craftActionHtml(npcId, idx)}
        </div>
        `;
    });
    div.innerHTML = html;
    if (npcId === 'npc_flame_shadow') div.innerHTML += buildDemonKingCraftHTML();   // 👑 炎魔之影：在通用配方下方附加惡魔王武器客製製作區
    if (npcId === 'npc_lumiel') div.innerHTML += buildLumielCraftHTML();   // ⚔️ 琉米埃爾：在通用配方下方附加神聖執行團裝備客製製作區
}

// ===== 👑 惡魔王武器客製製作（炎魔之影）：消耗 +11 以上「指定」惡魔武器，繼承其強化值／詞綴／席琳套裝效果；不支援席琳製作 =====
const DEMONKING_MATS = [{ id: 'mat_soulstone_shard', cnt: 300 }, { id: 'mat_blackmithril_plate', cnt: 5 }, { id: 'mat_death_head', cnt: 1 }, { id: 'mat_chaos_head', cnt: 1 }];
const DEMONKING_RECIPES = [
    { result: 'wpn_demonking_spear',   src: 'wpn_demon_xbow',  srcName: '惡魔十字弓' },
    { result: 'wpn_demonking_dual',    src: 'wpn_demon_dual',  srcName: '惡魔雙刀' },
    { result: 'wpn_demonking_2hsword', src: 'wpn_demon_sword', srcName: '惡魔之劍' },
    { result: 'wpn_demonking_wand',    src: 'wpn_demon_sword', srcName: '惡魔之劍' },
    { result: 'wpn_demonking_bow',     src: 'wpn_demon_xbow',  srcName: '惡魔十字弓' },
];
// 背包＋倉庫中可作素材的 +11 以上指定惡魔武器：優先「有席琳套裝」者，其次「強化值最高」者；未鎖定
function findDemonKingSource(srcId) {
    let cands = player.inv.filter(i => i.id === srcId && (i.en || 0) >= 11 && !i.lock);
    try { loadWarehouse().items.filter(i => i.id === srcId && (i.en || 0) >= 11 && !i.lock).forEach(i => cands.push(Object.assign({}, i, { _whSource: true }))); } catch (e) {}   // 🔧 倉庫中的 +11 惡魔武器亦可作素材（_whSource 標記：消耗時自倉庫精準扣除）
    if (!cands.length) return null;
    let withSet = cands.filter(i => i.seteff);
    let pool = (withSet.length ? withSet : cands).slice().sort((a, b) => (b.en || 0) - (a.en || 0));
    return pool[0];
}
function buildDemonKingCraftHTML() {
    let html = `<div class="text-amber-300 font-bold text-sm mt-4 mb-2 px-1 border-t border-slate-700 pt-3">👑 惡魔王武器（消耗 +11 以上指定惡魔武器，繼承其強化值／詞綴／席琳套裝效果；不支援席琳製作）</div>`;
    DEMONKING_RECIPES.forEach((r, idx) => {
        let resItem = DB.items[r.result];
        let imgUrl = getIconUrl(resItem);
        let matsOk = DEMONKING_MATS.every(m => invCountId(m.id) >= m.cnt);
        let src = findDemonKingSource(r.src);
        let canMake = matsOk && !!src;
        let srcColor = src ? 'text-green-400' : 'text-red-400';
        let srcExtra = src ? `（將消耗 +${src.en || 0}${src.seteff ? '・席琳套裝' : ''}）` : '';
        let reqHtml = craftReqHtml(DEMONKING_MATS)
            + `<span class="text-slate-500 mx-2 leading-none">+</span><span class="text-sm font-bold leading-none ${srcColor}">+11以上 ${r.srcName} ×1</span><span class="text-amber-300 text-xs ml-0.5">${srcExtra}</span>`;
        html += `
        <div class="list-item bg-slate-800 rounded mb-2 border border-slate-700 p-3" style="display:flex !important; justify-content:space-between !important; align-items:center !important; width:100% !important; box-sizing:border-box !important;">
            <div class="flex items-center gap-4 min-w-0 flex-1">
                <div class="w-12 h-12 bg-slate-900 rounded border border-slate-600 flex items-center justify-center shrink-0 tip-host">
                    <img src="${imgUrl}" onerror="this.style.display='none';" class="w-10 h-10 object-contain pointer-events-none">
                </div>
                <div class="flex flex-col items-start gap-1.5">
                    <span class="${getItemColor({ id: r.result })} font-bold text-lg leading-none truncate">${resItem.n}</span>
                    <div class="flex items-center gap-2 flex-wrap"><span class="text-slate-400 text-sm">需求：</span>${reqHtml}</div>
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <button class="btn ${canMake ? 'bg-blue-700 hover:bg-blue-600 border-blue-500' : 'bg-slate-700 border-slate-600 opacity-60'} py-2 px-6 font-bold shadow" ${canMake ? '' : 'disabled'} onclick="doDemonKingCraft(${idx})">製作</button>
            </div>
        </div>`;
    });
    return html;
}
function doDemonKingCraft(idx) {
    let r = DEMONKING_RECIPES[idx];
    if (!r) return;
    let lack = DEMONKING_MATS.filter(m => invCountId(m.id) < m.cnt).map(m => `${DB.items[m.id].n} ${m.cnt - invCountId(m.id)}`);
    let src = findDemonKingSource(r.src);
    if (!src) lack.push(`+11以上 ${r.srcName} ×1`);
    if (lack.length) { logSys(`<span class="text-red-400 font-bold">材料不足，無法製作。</span><span class="text-red-300">（尚缺：${lack.join('、')}）</span>`); return; }
    DEMONKING_MATS.forEach(m => consumeMaterialById(m.id, m.cnt));
    let inherit = { en: src.en || 0, attr: src.attr || false, bless: src.bless || false, anc: src.anc || false, seteff: src.seteff || false };
    if (src._whSource) { whRemoveStackByUid(src.uid, 1); }   // 🔧 來源武器在倉庫：自倉庫精準消耗該實例
    else if ((src.cnt || 1) > 1) src.cnt -= 1; else player.inv = player.inv.filter(i => i.uid !== src.uid);   // 消耗 1 把來源惡魔武器（背包）
    let inst = { id: r.result, uid: uid(), cnt: 1, en: inherit.en, attr: inherit.attr, bless: inherit.bless, anc: inherit.anc, seteff: inherit.seteff, lock: false };
    player.inv.push(inst);
    logSys(`<span class="text-amber-200 font-bold">炎魔之影</span> 製作完成：<span class="${getItemColor(inst)} font-bold">${getItemFullName(inst)}</span>${inherit.seteff ? '（繼承席琳套裝效果）' : ''}`);
    updateUI(); renderTabs(true); saveGame();
    renderUniversalCraft(document.getElementById('interaction-content'), 'npc_flame_shadow');
}
// ===== ⚔️ 琉米埃爾（海音）神聖執行團裝備客製製作：消耗 +7 以上「戰士團」頭盔／斗篷，繼承其強化值／詞綴 =====
const LUMIEL_RECIPES = [
    { result: 'hlm_holy_corps', src: 'hlm_warrior_corps', srcName: '戰士團頭盔', mats: [{ id: 'new_item_153', cnt: 1 }, { id: 'new_item_158', cnt: 5 }, { id: 'new_item_160', cnt: 30 }, { id: 'new_item_154', cnt: 30 }] },
    { result: 'clk_holy_corps', src: 'clk_warrior_corps', srcName: '戰士團斗篷', mats: [{ id: 'new_item_156', cnt: 1 }, { id: 'new_item_161', cnt: 5 }, { id: 'new_item_157', cnt: 30 }, { id: 'new_item_151', cnt: 30 }] },
];
function findLumielSource(srcId) {
    let cands = player.inv.filter(i => i.id === srcId && (i.en || 0) >= 7 && !i.lock);
    try { loadWarehouse().items.filter(i => i.id === srcId && (i.en || 0) >= 7 && !i.lock).forEach(i => cands.push(Object.assign({}, i, { _whSource: true }))); } catch (e) {}   // 🔧 倉庫中的 +7 戰士團裝備亦可作素材
    if (!cands.length) return null;
    let withSet = cands.filter(i => i.seteff);
    let pool = (withSet.length ? withSet : cands).slice().sort((a, b) => (b.en || 0) - (a.en || 0));
    return pool[0];
}
function buildLumielCraftHTML() {
    let html = `<div class="text-amber-300 font-bold text-sm mt-4 mb-2 px-1 border-t border-slate-700 pt-3">⚔️ 神聖執行團裝備（消耗 +7 以上戰士團裝備，繼承其強化值／詞綴）</div>`;
    LUMIEL_RECIPES.forEach((r, idx) => {
        let resItem = DB.items[r.result];
        let imgUrl = getIconUrl(resItem);
        let matsOk = r.mats.every(m => invCountId(m.id) >= m.cnt);
        let src = findLumielSource(r.src);
        let canMake = matsOk && !!src;
        let srcColor = src ? 'text-green-400' : 'text-red-400';
        let srcExtra = src ? `（將消耗 +${src.en || 0}${src.seteff ? '・席琳套裝' : ''}）` : '';
        let reqHtml = craftReqHtml(r.mats)
            + `<span class="text-slate-500 mx-2 leading-none">+</span><span class="text-sm font-bold leading-none ${srcColor}">+7以上 ${r.srcName} ×1</span><span class="text-amber-300 text-xs ml-0.5">${srcExtra}</span>`;
        html += `
        <div class="list-item bg-slate-800 rounded mb-2 border border-slate-700 p-3" style="display:flex !important; justify-content:space-between !important; align-items:center !important; width:100% !important; box-sizing:border-box !important;">
            <div class="flex items-center gap-4 min-w-0 flex-1">
                <div class="w-12 h-12 bg-slate-900 rounded border border-slate-600 flex items-center justify-center shrink-0 tip-host">
                    <img src="${imgUrl}" onerror="this.style.display='none';" class="w-10 h-10 object-contain pointer-events-none">
                </div>
                <div class="flex flex-col items-start gap-1.5">
                    <span class="${getItemColor({ id: r.result })} font-bold text-lg leading-none truncate">${resItem.n}</span>
                    <div class="flex items-center gap-2 flex-wrap"><span class="text-slate-400 text-sm">需求：</span>${reqHtml}</div>
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <button class="btn ${canMake ? 'bg-blue-700 hover:bg-blue-600 border-blue-500' : 'bg-slate-700 border-slate-600 opacity-60'} py-2 px-6 font-bold shadow" ${canMake ? '' : 'disabled'} onclick="doLumielCraft(${idx})">製作</button>
            </div>
        </div>`;
    });
    return html;
}
function doLumielCraft(idx) {
    let r = LUMIEL_RECIPES[idx];
    if (!r) return;
    let lack = r.mats.filter(m => invCountId(m.id) < m.cnt).map(m => `${DB.items[m.id].n} ${m.cnt - invCountId(m.id)}`);
    let src = findLumielSource(r.src);
    if (!src) lack.push(`+7以上 ${r.srcName} ×1`);
    if (lack.length) { logSys(`<span class="text-red-400 font-bold">材料不足，無法製作。</span><span class="text-red-300">（尚缺：${lack.join('、')}）</span>`); return; }
    r.mats.forEach(m => consumeMaterialById(m.id, m.cnt));
    let inherit = { en: src.en || 0, attr: src.attr || false, bless: src.bless || false, anc: src.anc || false, seteff: src.seteff || false };
    if (src._whSource) { whRemoveStackByUid(src.uid, 1); }   // 來源裝備在倉庫：自倉庫精準消耗
    else if ((src.cnt || 1) > 1) src.cnt -= 1; else player.inv = player.inv.filter(i => i.uid !== src.uid);   // 消耗 1 件來源戰士團裝備（背包）
    let inst = { id: r.result, uid: uid(), cnt: 1, en: inherit.en, attr: inherit.attr, bless: inherit.bless, anc: inherit.anc, seteff: inherit.seteff, lock: false };
    player.inv.push(inst);
    logSys(`<span class="text-amber-200 font-bold">琉米埃爾</span> 製作完成：<span class="${getItemColor(inst)} font-bold">${getItemFullName(inst)}</span>`);
    updateUI(); renderTabs(true); saveGame();
    renderUniversalCraft(document.getElementById('interaction-content'), 'npc_lumiel');
}

// 2. 渲染茉莉的製作介面
function renderMoliCraft(div) {
    let recipes = CRAFT_RECIPES['npc_moli'];
    let html = '';
    
    recipes.forEach((r, idx) => {
        let resItem = DB.items[r.result];
        
        // 組合材料需求字串
        let reqHtml = craftReqHtml(r.req);

        let imgUrl = getIconUrl(resItem);
        
        html += `
        <div class="list-item bg-slate-800 rounded mb-2 border border-slate-700 p-3 hover:bg-slate-700 transition-colors" style="display:flex !important; justify-content:space-between !important; align-items:center !important; width:100% !important; box-sizing:border-box !important;">
            <div class="flex items-center gap-4 min-w-0 flex-1">
                <div class="w-12 h-12 bg-slate-900 rounded border border-slate-600 flex items-center justify-center shrink-0 tip-host">
                    <img src="${imgUrl}" onerror="this.style.display='none';" class="w-10 h-10 object-contain pointer-events-none">
                </div>
                <div class="flex flex-col items-start gap-1.5">
                    <span class="${getItemColor({ id: r.result })} font-bold text-lg leading-none truncate">${resItem.n}</span>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-slate-400 text-sm">需求：</span>${reqHtml}
                    </div>
                </div>
            </div>
            ${craftActionHtml('npc_moli', idx)}
        </div>
        `;
    });
    div.innerHTML = html;
}
// 渲染布拉伯的製作介面
function renderBraboCraft(div) {
    let recipes = CRAFT_RECIPES['npc_brabo'];
    let html = '';
    
    recipes.forEach((r, idx) => {
        let resItem = DB.items[r.result];
        
        let reqHtml = craftReqHtml(r.req);

        let imgUrl = getIconUrl(resItem);
        
        html += `
        <div class="list-item bg-slate-800 rounded mb-2 border border-slate-700 p-3 hover:bg-slate-700 transition-colors" style="display:flex !important; justify-content:space-between !important; align-items:center !important; width:100% !important; box-sizing:border-box !important;">
            <div class="flex items-center gap-4 min-w-0 flex-1">
                <div class="w-12 h-12 bg-slate-900 rounded border border-slate-600 flex items-center justify-center shrink-0 tip-host">
                    <img src="${imgUrl}" onerror="this.style.display='none';" class="w-10 h-10 object-contain pointer-events-none">
                </div>
                <div class="flex flex-col items-start gap-1.5">
                    <span class="${getItemColor({ id: r.result })} font-bold text-lg leading-none truncate">${resItem.n}</span>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-slate-400 text-sm">需求：</span>${reqHtml}
                    </div>
                </div>
            </div>
            ${craftActionHtml('npc_brabo', idx)}
        </div>
        `;
    });
    div.innerHTML = html;
}
function renderFinnCraft(div, npcId) {
    let recipes = CRAFT_RECIPES[npcId];
    let html = '';
    
    recipes.forEach((r, idx) => {
        let resItem = DB.items[r.result];
        
        let reqHtml = craftReqHtml(r.req);

        let imgUrl = getIconUrl(resItem);
        
        html += `
        <div class="list-item bg-slate-800 rounded mb-2 border border-slate-700 p-3 hover:bg-slate-700 transition-colors" style="display:flex !important; justify-content:space-between !important; align-items:center !important; width:100% !important; box-sizing:border-box !important;">
            <div class="flex items-center gap-4 min-w-0 flex-1">
                <div class="w-12 h-12 bg-slate-900 rounded border border-slate-600 flex items-center justify-center shrink-0 tip-host">
                    <img src="${imgUrl}" onerror="this.style.display='none';" class="w-10 h-10 object-contain pointer-events-none">
                </div>
                <div class="flex flex-col items-start gap-1.5">
                    <span class="${getItemColor({ id: r.result })} font-bold text-lg leading-none truncate">${resItem.n}</span>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-slate-400 text-sm">需求：</span>${reqHtml}
                    </div>
                </div>
            </div>
            ${craftActionHtml(npcId, idx)}
        </div>
        `;
    });
    div.innerHTML = html;
}
function renderJoelCraft(div, npcId) {
    let recipes = CRAFT_RECIPES[npcId];
    let html = '';
    
    recipes.forEach((r, idx) => {
        let resItem = DB.items[r.result];
        
        let reqHtml = craftReqHtml(r.req);

        let imgUrl = getIconUrl(resItem);
        
        html += `
        <div class="list-item bg-slate-800 rounded mb-2 border border-slate-700 p-3 hover:bg-slate-700 transition-colors" style="display:flex !important; justify-content:space-between !important; align-items:center !important; width:100% !important; box-sizing:border-box !important;">
            <div class="flex items-center gap-4 min-w-0 flex-1">
                <div class="w-12 h-12 bg-slate-900 rounded border border-slate-600 flex items-center justify-center shrink-0 tip-host">
                    <img src="${imgUrl}" onerror="this.style.display='none';" class="w-10 h-10 object-contain pointer-events-none">
                </div>
                <div class="flex flex-col items-start gap-1.5">
                    <span class="${getItemColor({ id: r.result })} font-bold text-lg leading-none truncate">${resItem.n}</span>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-slate-400 text-sm">需求：</span>${reqHtml}
                    </div>
                </div>
            </div>
            ${craftActionHtml(npcId, idx)}
        </div>
        `;
    });
    div.innerHTML = html;
}
// 3. 執行製作扣除材料與發放物品
// ===== 🔧 製作材料配色：所有「非裝備」的製作需求材料，名字統一丁香紫 =====
// 掃描全部配方的需求清單，物品類型不是 武器/防具/飾品 者套用 text-purple-300。
// 排除：金幣、席琳結晶（保留呼吸綠光 c-sherine）、試煉材料（同為合成材料時以試煉藍色優先）。
const QUEST_MATERIAL_IDS = [   // 試煉兌換材料＋卡瑞觸發道具（名字固定藍色，不被製作配色覆蓋）
    'new_item_196', 'new_item_198', 'new_item_199', 'new_item_200', 'new_item_201', 'new_item_202',
    'new_item_203', 'new_item_204', 'new_item_205', 'new_item_206', 'new_item_208',
    'new_item_212', 'new_item_213', 'new_item_214', 'new_item_240', 'new_item_144',
    'item_blueflute', 'item_ancientkey', 'item_nightvision',
    'item_dragon_claw', 'item_lizard_horn', 'item_crystal_ball', 'item_orc_amulet'
];
(function initCraftMaterialColors() {
    let seen = new Set();
    for (let npc in CRAFT_RECIPES) {
        (CRAFT_RECIPES[npc] || []).forEach(r => (r.req || []).forEach(q => {
            if (q.id === 'gold' || q.id === 'sherine_crystal' || QUEST_MATERIAL_IDS.includes(q.id) || seen.has(q.id)) return;
            seen.add(q.id);
            let d = DB.items[q.id];
            if (d && d.type !== 'wpn' && d.type !== 'arm' && d.type !== 'acc') d.c = 'text-purple-300';
        }));
    }
})();

// ===== 遞迴製作：前置材料足夠即可直接製作（自動補製中間物品，消耗最底層材料）=====
let RECIPE_BY_RESULT = null;
function buildRecipeIndex() {
    RECIPE_BY_RESULT = {};
    for (let npc in CRAFT_RECIPES) for (let r of CRAFT_RECIPES[npc]) {
        if (!RECIPE_BY_RESULT[r.result]) RECIPE_BY_RESULT[r.result] = r;
    }
}
// ===== 🔧 倉庫材料支援：製作與試煉兌換可動用共用倉庫的材料（背包優先、不足再扣倉庫；金幣僅算身上）=====
function whCountId(id) {
    if (id === 'gold') return 0;   // 倉庫金幣不列入材料計算
    try { let w = loadWarehouse(); return w.items.filter(i => i.id === id).reduce((s, i) => s + i.cnt, 0); } catch (e) { return 0; }
}
function whConsumeId(id, n) {   // 自倉庫扣除最多 n 個（白板/低強化優先），回傳實際扣除數
    if (n <= 0) return 0;
    try {
        let w = loadWarehouse();
        let need = n, stacks = w.items.filter(i => i.id === id);
        stacks.sort((a, b) => (((a.en||0)*100)+(a.anc?10:0)+(a.bless?10:0)+(a.attr?10:0)+(a.seteff?50:0)) - (((b.en||0)*100)+(b.anc?10:0)+(b.bless?10:0)+(b.attr?10:0)+(b.seteff?50:0)));
        for (let st of stacks) { if (need <= 0) break; let d = Math.min(st.cnt, need); st.cnt -= d; need -= d; }
        w.items = w.items.filter(i => i.cnt > 0);
        saveWarehouse(w);
        return n - need;
    } catch (e) { return 0; }
}
// 🔧 自倉庫精準移除指定 uid 的堆疊（n 預設 1）：強化/詞綴/席琳套裝武器作素材時，消耗該唯一實例
function whRemoveStackByUid(uid, n) {
    n = n || 1;
    try {
        let w = loadWarehouse();
        let idx = w.items.findIndex(i => i.uid === uid);
        if (idx < 0) return false;
        let st = w.items[idx];
        if ((st.cnt || 1) > n) st.cnt -= n; else w.items.splice(idx, 1);
        saveWarehouse(w);
        return true;
    } catch (e) { return false; }
}
// 試煉兌換用：背包＋倉庫合併計數 / 扣除
function questCountId(id) { return player.inv.filter(i => i.id === id).reduce((s, i) => s + i.cnt, 0) + whCountId(id); }
function questConsumeId(id, n) {
    let need = n;
    for (let it of player.inv.filter(i => i.id === id)) { if (need <= 0) break; let d = Math.min(it.cnt, need); it.cnt -= d; need -= d; }
    player.inv = player.inv.filter(i => i.cnt > 0);
    if (need > 0) whConsumeId(id, need);
}

function invCountId(id) {
    if (id === 'gold') return player.gold;
    return player.inv.filter(i => i.id === id).reduce((s, i) => s + i.cnt, 0) + whCountId(id);   // 🔧 含倉庫存量
}
function buildPool() {
    let pool = { gold: player.gold };
    for (let it of player.inv) pool[it.id] = (pool[it.id] || 0) + it.cnt;
    try { for (let it of loadWarehouse().items) pool[it.id] = (pool[it.id] || 0) + it.cnt; } catch (e) {}   // 🔧 倉庫材料一併列入模擬池
    return pool;
}
function simulateMake(id, count, pool, depth) {
    if (count <= 0) return true;
    if (depth > 24) return false;
    let stock = pool[id] || 0, use = Math.min(stock, count);
    pool[id] = stock - use;
    let remain = count - use;
    if (remain <= 0) return true;
    if (id === 'gold') return false;
    let rec = RECIPE_BY_RESULT[id];
    if (!rec) return false;
    let y = rec.yield || 1, batches = Math.ceil(remain / y);
    for (let req of rec.req) if (!simulateMake(req.id, req.cnt * batches, pool, depth + 1)) return false;
    pool[id] = (pool[id] || 0) + (batches * y - remain);
    return true;
}
function simRecipe(recipe, count) {
    let pool = buildPool();
    for (let req of recipe.req) if (!simulateMake(req.id, req.cnt * count, pool, 0)) return false;
    return true;
}
function maxMakeRecipe(recipe) {
    if (!simRecipe(recipe, 1)) return 0;
    let lo = 1, hi = 2;
    while (simRecipe(recipe, hi)) { lo = hi; hi *= 2; if (hi > 1e6) return lo; }
    while (lo < hi) { let mid = Math.ceil((lo + hi) / 2); if (simRecipe(recipe, mid)) lo = mid; else hi = mid - 1; }
    return lo;
}
function materialObtainable(id, cnt) {
    if (invCountId(id) >= cnt) return true;
    if (!RECIPE_BY_RESULT) buildRecipeIndex();
    return simulateMake(id, cnt, buildPool(), 0);
}
function consumeMaterialById(id, n) {
    if (id === 'gold') { player.gold -= n; return; }
    let need = n, stacks = player.inv.filter(i => i.id === id);
    stacks.sort((a, b) => ((a.en*100)+(a.anc?10:0)+(a.bless?10:0)+(a.attr?10:0)) - ((b.en*100)+(b.anc?10:0)+(b.bless?10:0)+(b.attr?10:0)));
    for (let st of stacks) { if (need <= 0) break; let d = Math.min(st.cnt, need); st.cnt -= d; need -= d; }
    player.inv = player.inv.filter(i => i.cnt > 0);
    if (need > 0) whConsumeId(id, need);   // 🔧 背包不足：自倉庫扣除
}
function ensureMaterial(id, count, depth) {
    if (id === 'gold' || depth > 24) return;
    let have = invCountId(id);
    if (have >= count) return;
    let rec = RECIPE_BY_RESULT[id];
    if (!rec) return;
    let need = count - have, y = rec.yield || 1, batches = Math.ceil(need / y);
    for (let req of rec.req) ensureMaterial(req.id, req.cnt * batches, depth + 1);
    for (let req of rec.req) consumeMaterialById(req.id, req.cnt * batches);
    gainItem(id, batches * y, true, true);
}
// 計算製作 count 個某配方時，缺少的「最底層材料 / 金幣」與數量（遞迴展開中間物）
function craftReqHtml(reqArr) {
    if (!RECIPE_BY_RESULT) buildRecipeIndex();
    return reqArr.map(req => {
        if (req.id === 'gold') {
            let hasCnt = player.gold;
            let color = hasCnt >= req.cnt ? 'text-green-400' : 'text-red-400';   // 金幣無法合成
            return `<span class="text-sm font-bold leading-none"><span class="${color}">${hasCnt}</span>/${req.cnt} 金幣</span>`;
        }
        let reqItem = DB.items[req.id];
        let hasCnt = invCountId(req.id);   // 🔧 含倉庫存量
        let color, extra = '';
        if (hasCnt >= req.cnt) color = 'text-green-400';
        else if (materialObtainable(req.id, req.cnt)) { color = 'text-amber-400'; extra = '<span class="text-amber-400 text-xs ml-0.5">(可合成)</span>'; }
        else color = 'text-red-400';
        return `<span class="text-sm font-bold leading-none"><span class="${color}">${hasCnt}</span>/${req.cnt} ${reqItem.n}${extra}</span>`;
    }).join('<span class="text-slate-500 mx-2 leading-none">+</span>');
}
function craftShortfall(recipe, count) {
    if (!RECIPE_BY_RESULT) buildRecipeIndex();
    let pool = buildPool(), lack = {};
    function take(id, n) {
        if (n <= 0) return;
        let avail = pool[id] || 0, use = Math.min(avail, n);
        pool[id] = avail - use;
        let rem = n - use;
        if (rem <= 0) return;
        let rec = RECIPE_BY_RESULT[id];
        if (id === 'gold' || !rec) { lack[id] = (lack[id] || 0) + rem; return; }   // 葉子/金幣不足 → 記錄缺口
        let y = rec.yield || 1, b = Math.ceil(rem / y);
        for (let q of rec.req) take(q.id, q.cnt * b);
        pool[id] = (pool[id] || 0) + (b * y - rem);
    }
    for (let q of recipe.req) take(q.id, q.cnt * count);
    return lack;
}
function doCraft(npcId, recipeIdx, sherine) {   // 🔮 sherine=true：席琳製作（材料＋每件 1 個席琳結晶，成品必帶套裝效果）
    let recipe = CRAFT_RECIPES[npcId][recipeIdx];
    if (!recipe) return;

    // 讀取選擇的製作數量（預設 1）
    let qtyInput = document.getElementById(`craft-qty-${npcId}-${recipeIdx}`);
    let qty = Math.max(1, parseInt(qtyInput && qtyInput.value) || 1);

    // 計算最多可製作幾個（遞迴：前置材料足夠即可，會自動補製中間物品）
    if (!RECIPE_BY_RESULT) buildRecipeIndex();
    let maxCraftable = maxMakeRecipe(recipe);

    if (maxCraftable < 1) {
        // 材料不足以製作 1 個：列出實際缺少的最底層材料/金幣，方便判斷
        let lack = craftShortfall(recipe, 1);
        let parts = Object.keys(lack).map(id => id === 'gold'
            ? `金幣 ${lack[id]}` : `${(DB.items[id] && DB.items[id].n) || id} ${lack[id]}`);
        // 🔮 席琳製作：身上與倉庫都沒有席琳結晶時，一併列入缺少清單
        if (sherine && invCountId('sherine_crystal') < 1) {
            parts.push('席琳結晶 1');
        }
        let detail = parts.length ? `（尚缺：${parts.join('、')}）` : '';
        logSys(`<span class="text-red-400 font-bold">材料不足，無法製作。</span><span class="text-red-300">${detail}</span>`);
        return;
    }

    // 選擇數量超過可製作數時，自動做出可製作的最大量
    let makeCount = Math.min(qty, maxCraftable);

    // 🔮 席琳製作：每件成品消耗 1 個席琳結晶；結晶不足時以結晶數為上限（🔧 含倉庫存量）
    if (sherine) {
        let _cc = invCountId('sherine_crystal');
        if (_cc < 1) { logSys('<span class="text-red-400 font-bold">材料不足，無法製作。</span><span class="text-red-300">（尚缺：席琳結晶 1）</span>'); return; }
        if (makeCount > _cc) makeCount = _cc;
    }

    // 前置：自動補製不足的中間物品（maxMakeRecipe 已確認整體可行）
    for (let r of recipe.req) ensureMaterial(r.id, r.cnt * makeCount, 0);

    // 扣除材料 × makeCount（跨堆疊、白板/低強化優先；🔧 背包不足時自動扣共用倉庫，統一走 consumeMaterialById）
    for (let r of recipe.req) consumeMaterialById(r.id, r.cnt * makeCount);

    // 🔮 席琳製作：扣除結晶（每件 1 個；🔧 背包優先、不足扣倉庫）
    if (sherine) consumeMaterialById('sherine_crystal', makeCount);

    // 產出（逐個產生，使每件各自有 1% 機率取得隨機詞綴；靜音後統一記錄一次）
    _tradLootCtx = true;   // 🏛️ 傳統模式：製作的武器/防具/飾品隨機自帶強化值（寵物裝備走 forceNormal、材料非裝備→皆不受影響、恆 +0）
    try {
        for (let k = 0; k < makeCount; k++) {
            _forceSherineSet = !!sherine;   // 🔮 席琳製作：每件成品必定附帶隨機一種席琳套裝效果（其餘詞綴機率照舊）
            let _petGearResult = !!(DB.items[recipe.result] && DB.items[recipe.result].slot === 'pet');   // 🦴 寵物裝備：白板製作，不附任何詞綴
            gainItem(recipe.result, recipe.yield || 1, true, _petGearResult);
            _forceSherineSet = false;
        }
    } finally { _tradLootCtx = false; _forceSherineSet = false; }   // try/finally：例外也必清旗標，杜絕殘留洩漏
    let totalOut = (recipe.yield || 1) * makeCount;
    logSys(`${sherine ? '<span class="c-sherine font-bold">席琳製作</span>' : '製作'}完成：<span class="${getItemColor({ id: recipe.result })} font-bold">${DB.items[recipe.result].n}</span> ×${totalOut}${sherine ? `（消耗 席琳結晶 ×${makeCount}）` : ''}`);

    // 重新渲染介面與左側狀態列
    updateUI();
    renderTabs();

    if (npcId === 'npc_moli' || npcId === 'npc_ladal') {
        renderMoliCraft(document.getElementById('interaction-content'));
    } else if (npcId === 'npc_brabo') {
        renderBraboCraft(document.getElementById('interaction-content'));
    } else if (npcId === 'npc_finn' || npcId === 'npc_falin') {
        renderFinnCraft(document.getElementById('interaction-content'), npcId);
    } else if (npcId === 'npc_joel' || npcId === 'npc_ryan') {
        renderJoelCraft(document.getElementById('interaction-content'), npcId);
    } else if (['npc_nalien', 'npc_rekne', 'npc_narupa', 'npc_elfqueen', 'npc_elf', 'npc_ent', 'npc_pan', 'npc_moliya', 'npc_hector', 'npc_herbert', 'npc_lumiel', 'npc_ibelbin', 'npc_tas', 'npc_robinson', 'npc_kupu', 'npc_lentis', 'npc_upni', 'npc_bamut', 'npc_flame_shadow', 'npc_imp', 'npc_flame_smith', 'npc_norse', 'npc_keluya', 'npc_dytite', 'npc_bartel', 'npc_pir', 'npc_zeus_golem', 'npc_rabiani', 'npc_david', 'npc_flame_aide', 'npc_kororanz', 'npc_sebas'].includes(npcId)) {
        renderUniversalCraft(document.getElementById('interaction-content'), npcId);
    }

    // 數量設定：選擇數量超過可製作數 → 回到 1；否則保留所選數量
    let qtyInput2 = document.getElementById(`craft-qty-${npcId}-${recipeIdx}`);
    if (qtyInput2) qtyInput2.value = (qty > maxCraftable) ? 1 : qty;

    saveGame();
}
let gachaRolling = false; // 防止玩家狂點按鈕

function renderPandoraGacha(div) {
    // 🔧 潘朵拉黑市（取代舊抽獎機）：每 10 分鐘上架一件商品，可直接購買
    _pandoraDiv = div;
    refreshPandoraMarket(false);
    player.pandoraAnnounce = null;            // 玩家點開潘朵拉 → 清除稀有公告橫幅
    try { renderPandoraBanner(); } catch (e) {}
    try { saveGame(); } catch (e) {}          // 🔧 點擊潘朵拉即自動存檔，鎖定當下商品與剩餘時間
    pandoraRenderMarket(div);
    return;
    /* ===== 以下為舊抽獎機 UI，已停用（保留不執行） ===== */
    let ticketId = "new_item_239";
    let ticketItem = player.inv.find(i => i.id === ticketId);
    let ticketCount = (ticketItem && ticketItem.cnt > 0) ? ticketItem.cnt : 0;
    if (!window._gachaMode) window._gachaMode = 'single';
    let mode = window._gachaMode;

    let cells = '';
    for (let k = 0; k < 10; k++) {
        cells += `<div class="bg-slate-900 border-2 border-purple-700 rounded-lg aspect-square overflow-hidden"><div class="gacha10-icon w-full h-full flex items-center justify-center text-xl" data-idx="${k}">❓</div></div>`;
    }

    let html = `
    <div class="flex flex-col items-center justify-start h-full p-4 w-full">
        <h3 class="text-3xl font-bold text-purple-400 mb-1 drop-shadow-md">潘朵拉的黑市</h3>
        <p class="text-slate-300 text-xs mb-1 text-center">擁有潘朵拉抽獎卷：<span id="gacha-ticket-count" class="text-green-400 font-bold">${ticketCount}</span> 張</p>
        <p class="text-slate-400 text-xs mb-3 text-center">抽中的武器 / 防具 / 飾品各有 1% 機率帶有 屬性 / 遠古 / 祝福 詞綴！</p>

        <div class="flex gap-2 mb-4">
            <button id="gacha-tab-single" class="btn py-1.5 px-4 text-sm rounded-full ${mode==='single'?'bg-purple-700 border-purple-500':'bg-slate-700 border-slate-600'}" onclick="setGachaMode('single')">單抽</button>
            <button id="gacha-tab-ten" class="btn py-1.5 px-4 text-sm rounded-full ${mode==='ten'?'bg-purple-700 border-purple-500':'bg-slate-700 border-slate-600'}" onclick="setGachaMode('ten')">10 連抽</button>
        </div>

        <div id="gacha-single" class="${mode==='single'?'':'hidden'} flex flex-col items-center w-full">
            <div id="gacha-display" class="w-44 h-44 bg-slate-900 border-4 border-purple-700 rounded-xl shadow-[0_0_30px_rgba(126,34,206,0.6)] flex flex-col items-center justify-center mb-4 relative overflow-hidden">
                <span class="text-6xl" id="gacha-icon">❓</span>
                <div id="gacha-name" class="absolute bottom-0 w-full text-center text-sm font-bold text-white bg-black/80 px-2 py-1.5 hidden"></div>
            </div>
            <button id="btn-gacha" class="btn bg-purple-700 hover:bg-purple-600 border-purple-500 py-3 px-8 text-lg font-bold rounded-full shadow-[0_0_15px_rgba(126,34,206,0.5)] transition-all transform hover:scale-105" onclick="doPandoraGacha()">
                🎰 抽獎（${ticketCount>0?'1 張抽獎卷':(shopPrice(30000).toLocaleString()+' 金幣')}）
            </button>
        </div>

        <div id="gacha-ten" class="${mode==='ten'?'':'hidden'} flex flex-col items-center w-full">
            <div class="grid grid-cols-5 gap-1.5 w-full max-w-sm mb-3">${cells}</div>
            <button id="btn-gacha10" class="btn bg-purple-700 hover:bg-purple-600 border-purple-500 py-3 px-8 text-lg font-bold rounded-full shadow-[0_0_15px_rgba(126,34,206,0.5)] transition-all transform hover:scale-105" onclick="doPandoraGacha10()">
                🎰 10 連抽（${ticketCount>=10?'10 張抽獎卷':(shopPrice(300000).toLocaleString()+' 金幣')}）
            </button>
            <div id="gacha10-results" class="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3 text-sm"></div>
        </div>

        <p id="gacha-msg" class="text-yellow-300 mt-3 font-bold text-base min-h-8 text-center"></p>
    </div>
    `;

    div.innerHTML = html;
}

// 切換單抽 / 10連抽（抽獎進行中不可切換）
function setGachaMode(m) {
    if (gachaRolling) return;
    window._gachaMode = m;
    document.getElementById('gacha-single').classList.toggle('hidden', m !== 'single');
    document.getElementById('gacha-ten').classList.toggle('hidden', m !== 'ten');
    document.getElementById('gacha-tab-single').className = `btn py-1.5 px-4 text-sm rounded-full ${m==='single'?'bg-purple-700 border-purple-500':'bg-slate-700 border-slate-600'}`;
    document.getElementById('gacha-tab-ten').className = `btn py-1.5 px-4 text-sm rounded-full ${m==='ten'?'bg-purple-700 border-purple-500':'bg-slate-700 border-slate-600'}`;
    document.getElementById('gacha-msg').innerHTML = '';
}

// 更新面板上顯示的抽獎卷數量，並依目前卷數重新判斷兩個抽獎按鈕的成本顯示：
//   單抽：有 ≥1 張→只顯示「1 張抽獎卷」；不足→只顯示「30,000 金幣」。
//   10連：有 ≥10 張→只顯示「10 張抽獎卷」；不足（含有卷但<10）→只顯示「300,000 金幣」。
function refreshGachaTicketCount() {
    let t = player.inv.find(i => i.id === 'new_item_239');
    let cnt = t ? t.cnt : 0;
    let el = document.getElementById('gacha-ticket-count');
    if (el) el.innerText = cnt;
    let b1 = document.getElementById('btn-gacha');
    if (b1) b1.innerHTML = `🎰 抽獎（${cnt > 0 ? '1 張抽獎卷' : (shopPrice(30000).toLocaleString()+' 金幣')}）`;
    let b10 = document.getElementById('btn-gacha10');
    if (b10) b10.innerHTML = `🎰 10 連抽（${cnt >= 10 ? '10 張抽獎卷' : (shopPrice(300000).toLocaleString()+' 金幣')}）`;
}


// 🔧 已刪除重複定義的 getWeightedGachaResult（死碼）：與下方版本逐行等價，僅後者生效。

// ==========================================
// 👇 新增：1. 權重初始化函數 (遊戲載入時自動執行一次)
// ==========================================
(function initGachaWeights() {
    for (let id in DB.items) {
        let item = DB.items[id];
        
        // 如果已經有手動設定權重就跳過
        if (item.gachaWeight !== undefined) continue;

        // 任務道具、沒價格的物品，不放進抽獎池 (權重 0)
        if (!item.p || item.p <= 1 || (item.n && (item.n.includes("鑰匙") || item.n.includes("地圖")))) {
            item.gachaWeight = 0;
            continue;
        }

        // 依照價格 (p) 自動分配機率權重
        if (item.p > 100000) {
            item.gachaWeight = 1;     // 十萬以上極度稀有
        } else if (item.p > 30000) {
            item.gachaWeight = 10;    // 三萬以上稀有
        } else if (item.p > 10000) {
            item.gachaWeight = 20;    // 一萬以上罕見
        } else if (item.p > 1000) {
            item.gachaWeight = 50;   // 一千以上一般
        } else {
            item.gachaWeight = 100;  // 便宜貨超容易抽到
        }
    }
    // 🔧 低稀有度提升：權重 ≥ 50 的物品權重加倍（含手動設定與上方自動分配者），提高低稀有度出現率
    for (let id in DB.items) {
        let item = DB.items[id];
        if ((item.gachaWeight || 0) >= 50) item.gachaWeight *= 2;
    }
})();

// ==========================================
// 🔧 潘朵拉黑市權重覆寫（於 initGachaWeights 之後執行，覆蓋上方權重）：
//    ① 商店有販售的物品（武器／防具／道具）＋ 製作材料 → 權重 0（不會出現在黑市）
//    ② 只有 BOSS 才會掉落的物品 → 權重 1（黑市稀有商品）
//    ⚠️ PANDORA_SHOP_SOLD_IDS 需與 getShopItemsForNpc 的各商人販售清單保持一致；日後新增商店商品請同步補上。
// ==========================================
(function applyPandoraWeightRules() {
    // 商店販售品聯集（所有商人清單，不分職業；對應 getShopItemsForNpc）
    let PANDORA_SHOP_SOLD_IDS = new Set();
    for (let _k in SHOP_LISTS) (SHOP_LISTS[_k] || []).forEach(_id => PANDORA_SHOP_SOLD_IDS.add(_id));   // 🔧 商店販售品聯集（單一來源：SHOP_LISTS）
    // 製作材料：所有配方 req 輸入
    let craftMatSet = new Set();
    if (typeof CRAFT_RECIPES !== 'undefined') for (let npc in CRAFT_RECIPES) (CRAFT_RECIPES[npc] || []).forEach(r => (r.req || []).forEach(m => craftMatSet.add(m.id)));
    // 掉落來源彙整：itemId → { boss:有BOSS掉, normal:有非BOSS掉 }（怪名→怪物以判斷 boss 旗標）
    let mobByName = {};
    for (let mid in DB.mobs) { let mb = DB.mobs[mid]; if (mb && mb.n) mobByName[mb.n] = mb; }
    let dropFrom = {};
    let addDrop = (mobName, itemId) => { let mob = mobByName[mobName]; let e = dropFrom[itemId] || (dropFrom[itemId] = { boss: false, normal: false }); if (mob && mob.boss) e.boss = true; else e.normal = true; };
    let scan = tbl => { if (!tbl) return; for (let nm in tbl) (tbl[nm] || []).forEach(en => { let id = Array.isArray(en) ? en[0] : en; if (id) addDrop(nm, id); }); };
    if (typeof MOB_DROPS !== 'undefined') scan(MOB_DROPS);
    if (typeof DARK_WEAPON_DROPS !== 'undefined') scan(DARK_WEAPON_DROPS);
    if (typeof DARK_CRYSTAL_DROPS !== 'undefined') scan(DARK_CRYSTAL_DROPS);
    // 套用覆寫
    for (let id in DB.items) {
        let item = DB.items[id];
        if (PANDORA_SHOP_SOLD_IDS.has(id) || craftMatSet.has(id)) { item.gachaWeight = 0; continue; }   // 商店品／製作材料 → 0
        let df = dropFrom[id];
        if (df && df.boss && !df.normal) item.gachaWeight = 1;   // 僅 BOSS 掉落 → 1
    }
    ['wpn_dragonslayer','wpn_baless'].forEach(_id => { if (DB.items[_id]) DB.items[_id].gachaWeight = 1; });   // 🔧 屠龍劍／巴列斯魔杖：固定權重 1
    ['hlm_icequeen_charm','amr_icequeen_charm','bot_icequeen_charm'].forEach(_id => { if (DB.items[_id]) DB.items[_id].gachaWeight = 1; });   // ❄️👸 冰之女王魅力套裝：雖兼任寒冰製作素材(會被 craftMatSet 設0)，仍強制黑市權重 1
    [['hlm_official',10],['amr_official',10],['wpn_baranka_claw',10],['wpn_assassin_mark',10],['wpn_priest_wand',10],['wpn_laia_wand',10],['shd_priest_book',5]].forEach(([_id,_w]) => { if (DB.items[_id]) DB.items[_id].gachaWeight = _w; });   // 🔧 BOSS掉落但指定較高潘朵拉權重（不套用 BOSS專屬→1）
})();

// ==========================================
// 👇 新增：2. 根據權重抽獎的函數
// ==========================================
function getWeightedGachaResult(doubleNonRare) {
    let totalWeight = 0;
    let pool = [];

    // 建立抽獎池並計算總權重
    for (let id in DB.items) {
        if (TRAD_NO_SCROLLS[id] && traditionalActive()) continue;   // 🏛️ 傳統模式：潘朵拉黑市／抽獎不上架施法卷軸（武器/盔甲/飾品＋變體）
        let weight = DB.items[id].gachaWeight !== undefined ? DB.items[id].gachaWeight : 100;
        if (weight > 0) {
            if (doubleNonRare && weight !== 1) weight *= 2;   // 🔧 血盟野外特殊掉落：潘朵拉權重 1 以外的物品以 2 倍權重計算（權重100→200）
            totalWeight += weight;
            pool.push({ id: id, weight: weight });
        }
    }

    // 抽出隨機數
    let rand = Math.random() * totalWeight;
    let currentWeight = 0;

    // 找出對應的物品
    for (let item of pool) {
        currentWeight += item.weight;
        if (rand <= currentWeight) {
            return item.id;
        }
    }
    return pool[pool.length - 1].id;
}

// ==========================================
// 🔧 潘朵拉黑市（取代抽獎機；保留 gachaWeight 權重）
//    每 10 分鐘依權重隨機上架一件商品，下方有購買按鈕；售價依稀有度(權重)浮動。
// ==========================================
const PANDORA_CYCLE_TICKS = 6000;  // 10 分鐘 = 600 秒 × 10 tick/秒；以遊戲 tick 計時 → 存讀檔保留剩餘時間、離線不流逝、讀檔不重抽
let _pandoraDiv = null;            // 目前黑市面板容器（購買後重繪用）

// 依稀有度(權重)計算售價：
//   權重100(最常見) → 售價 × (1~20)   + 100
//   權重1  (最稀有) → 售價 × (100~2000) + 10,000,000
//   中間權重線性內插（權重一律以 [1,100] 計算，>100 視為 100）
function pandoraPrice(id) {
    let d = DB.items[id]; if (!d) return 1;
    let base = Math.max(1, d.p || 1);
    let w = Math.max(1, Math.min(100, d.gachaWeight || 100));
    let t = (100 - w) / 99;                          // 0 = 權重100(便宜)，1 = 權重1(昂貴)
    let loMult = Math.round(1   + 99      * t);      // 1   → 100（最小值不變）
    let hiMult = Math.round(40  + 3960    * t);      // 40  → 4000（最大值加倍：原 20→2000）
    let flat   = Math.round(100 + 9999900 * t);      // 100 → 10,000,000
    let mult = loMult + Math.floor(Math.random() * (hiMult - loMult + 1));
    return base * mult + flat;
}

// 刷新黑市商品（force 或距上次超過 10 分鐘才換）。回傳是否換上新商品。
function refreshPandoraMarket(force) {
    if (typeof player === 'undefined' || !player) return false;
    let nowT = (typeof state !== 'undefined' && state) ? (state.ticks || 0) : 0;
    let m = player.pandoraMarket;
    // 存讀檔保留商品與剩餘時間：以遊戲 tick 計時，未滿 10 分鐘(6000 tick)就不換、讀檔不重抽
    if (!force && m && DB.items[m.id] && (m.setTick !== undefined) && (nowT - m.setTick) < PANDORA_CYCLE_TICKS) return false;
    let id = getWeightedGachaResult();
    let d = DB.items[id] || {};
    let weight = d.gachaWeight || 100;
    player.pandoraMarket = { id: id, price: pandoraPrice(id), weight: weight, setTick: nowT };
    if (weight === 1) {
        player.pandoraAnnounce = id;   // 公告持續到：換上非稀有商品 或 玩家點擊潘朵拉
        let nm = d.n || '稀有商品';
        logSys(`<span class="text-purple-300 font-bold">📢【潘朵拉黑市】</span>珍稀商品 <span class="${getItemColor({id})}">${nm}</span> 已上架！限時 10 分鐘，前往潘朵拉黑市即可購買。`);
        if (typeof logCombat === 'function') logCombat(`<span class="text-purple-300 font-bold">📢【潘朵拉黑市】</span>珍稀商品 <span class="${getItemColor({id})}">${nm}</span> 上架！`, 'magic');
    } else {
        player.pandoraAnnounce = null;
    }
    try { renderPandoraBanner(); } catch (e) {}
    try { renderSyslogPandora(); } catch (e) {}
    return true;
}

// 稀有(權重1)商品上架時的常駐橫幅：持續到商品消失或玩家點擊潘朵拉
function renderPandoraBanner() {
    let el = document.getElementById('pandora-banner');
    let annId = (typeof player !== 'undefined' && player) ? player.pandoraAnnounce : null;
    if (annId && DB.items[annId]) {
        if (!el) {
            el = document.createElement('div');
            el.id = 'pandora-banner';
            el.className = 'fixed top-1 left-1/2 -translate-x-1/2 z-40 bg-black/85 border border-purple-400 text-purple-200 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(192,132,252,0.6)] animate-pulse pointer-events-none max-w-[92vw] text-center';
            document.body.appendChild(el);
        }
        el.innerHTML = `🌟 潘朵拉黑市出現珍稀商品：<span class="${getItemColor({id:annId})}">${DB.items[annId].n}</span>！`;
        el.style.display = '';
    } else if (el) {
        el.style.display = 'none';
    }
}

// 系統與物品日誌標題列右側：顯示黑市目前拍賣的商品（1% 權重＝橘金色，其餘＝白色）
function renderSyslogPandora() {
    let el = document.getElementById('syslog-pandora');
    if (!el) return;
    let m = (typeof player !== 'undefined' && player) ? player.pandoraMarket : null;
    let d = m ? DB.items[m.id] : null;
    if (!d) { el.innerHTML = ''; return; }
    // 1% 珍稀：亮紫（#c084fc，含淡光暈）；其餘：白。用 inline style 確保即時上色（Tailwind Play CDN 動態類別不一定同步生成）
    let nameStyle = (m.weight === 1) ? 'color:#c084fc;text-shadow:0 0 4px rgba(192,132,252,.5);' : 'color:#ffffff;';
    let soldTxt = m.sold ? '<span class="text-xs ml-1" style="color:#64748b;">（已售出）</span>' : '';
    el.innerHTML = `<span class="text-xs" style="color:#94a3b8;">黑市拍賣中：</span><span class="font-bold" style="${nameStyle}">${d.n}</span>${soldTxt}`;
}

// 繪製黑市面板（單一商品 + 購買按鈕）
function pandoraRenderMarket(div) {
    if (!div) return;
    let m = player.pandoraMarket;
    let d = m ? DB.items[m.id] : null;
    if (!d) { div.innerHTML = '<div class="p-6 text-center text-slate-300">黑市目前沒有商品，請稍候。</div>'; return; }
    let inst = { id: m.id };
    let img = getIconUrl(d);
    let glow = getGlowClass(inst, d);
    let nameColor = getItemColor(inst);
    let isRare = (m.weight === 1);
    let sold = !!m.sold;
    let afford = (player.gold || 0) >= m.price;
    let _elapsedT = ((typeof state !== 'undefined' && state) ? (state.ticks || 0) : 0) - (m.setTick || 0);
    let nextMin = Math.max(1, Math.ceil((PANDORA_CYCLE_TICKS - _elapsedT) / 600));   // 600 tick = 1 分鐘
    let descHtml = '';
    try { descHtml = buildItemDescHTML(inst); } catch (e) { descHtml = ''; }
    // 拍賣品外框樣式（珍稀＝亮紫脈動；一般＝琥珀金）
    let cardBorder = isRare ? 'border-purple-400' : 'border-amber-600/80';
    let cardShadow = isRare ? 'shadow-[0_0_40px_rgba(192,132,252,0.55)] animate-pulse' : 'shadow-[0_0_22px_rgba(180,120,40,0.30)]';
    let ribbonCls  = isRare ? 'bg-purple-500 text-purple-950 border-purple-200' : 'bg-amber-700 text-amber-50 border-amber-400';
    let caseBorder = isRare ? 'border-purple-500/70' : 'border-amber-600/40';
    let ribbonText = isRare ? '🔨 珍稀拍賣品' : '🔨 拍賣品';
    div.innerHTML = `
    <div class="flex flex-col items-center justify-start h-full p-4 w-full overflow-y-auto">
        <h3 class="text-3xl font-bold text-purple-400 mb-1 drop-shadow-md">潘朵拉黑市</h3>
        <p class="text-slate-400 text-xs mb-3 text-center">每 10 分鐘隨機上架一件商品，售價依稀有度浮動。<br>距下次更換約 <span class="text-slate-200">${nextMin}</span> 分鐘。</p>
        ${isRare && !sold ? `<p class="text-purple-300 font-bold text-sm mb-2 animate-pulse">🌟 珍稀商品上架中！🌟</p>` : ''}
        ${sold ? `<p class="text-red-400 font-bold text-sm mb-2">🚫 本輪商品已售出，約 ${nextMin} 分鐘後上架新商品。</p>` : ''}

        <!-- 拍賣品卡片：左圖示／中介紹價格／右購買 -->
        <div class="relative w-full max-w-xl mt-2 rounded-2xl border-2 ${sold ? 'border-slate-600' : cardBorder} ${sold ? '' : cardShadow} bg-gradient-to-b from-slate-800/90 to-slate-900/95 px-3 pt-6 pb-3">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-[11px] font-bold tracking-[0.25em] border ${ribbonCls} shadow">${ribbonText}</div>
            ${sold ? `<div class="absolute inset-0 rounded-2xl bg-black/45 flex items-center justify-center pointer-events-none z-10"><span class="text-3xl font-black text-red-500 border-4 border-red-500 rounded-lg px-5 py-1 -rotate-12 tracking-widest" style="text-shadow:0 0 8px rgba(0,0,0,.85);">已售出</span></div>` : ''}
            <!-- 固定高度內容列(120px)：三欄皆以 inline 樣式鎖定尺寸，不隨商品內容忽大忽小 -->
            <div class="flex items-stretch gap-3" style="height:120px;">
                <!-- 左：固定尺寸展示框（112×112，垂直置中、圖片固定 80×80、不切框） -->
                <div class="shrink-0 self-center rounded-xl bg-slate-950/70 border ${caseBorder} shadow-inner flex items-center justify-center" style="width:112px;height:112px;">
                    <img src="${img}" onerror="this.src='https://placehold.co/100x100/1e293b/ffffff?text=?';" class="object-contain ${sold ? 'opacity-30 grayscale' : glow}" style="width:80px;height:80px;">
                </div>
                <!-- 中：固定高度欄位（名稱固定一行、能力介紹固定區域可內捲、價格/金幣固定） -->
                <div class="flex-1 min-w-0 flex flex-col text-left" style="height:120px;min-height:0;">
                    <div class="text-base font-bold leading-tight ${nameColor} shrink-0 truncate">${getItemFullName(inst)}</div>
                    <div class="text-[11px] text-slate-300 leading-relaxed mt-1 flex-1 overflow-y-auto pr-1" style="min-height:0;">${descHtml}</div>
                    <div class="shrink-0 mt-1">
                        <div class="text-yellow-400 font-bold text-base leading-none truncate">售價：${m.price.toLocaleString()} <span class="text-xs text-slate-400 font-normal">金幣</span></div>
                        <div class="text-[11px] text-slate-400 mt-0.5 truncate">你的金幣：<span class="${afford ? 'text-green-400' : 'text-red-400'}">${(player.gold || 0).toLocaleString()}</span></div>
                    </div>
                </div>
                <!-- 右：固定大小購買按鈕（84×112，內容固定） -->
                <div class="shrink-0 self-center relative z-20">
                    ${sold
                      ? `<button disabled class="btn bg-slate-700 border-slate-600 opacity-70 cursor-not-allowed text-base font-bold rounded-xl leading-tight flex flex-col items-center justify-center" style="width:84px;height:112px;"><span class="text-2xl leading-none">✅</span><span class="mt-1">已賣出</span></button>`
                      : `<button id="btn-pandora-buy" onclick="buyPandoraItem()" ${afford ? '' : 'disabled'}
                        class="btn ${afford ? 'bg-purple-700 hover:bg-purple-600 border-purple-500' : 'bg-slate-700 border-slate-600 opacity-60 cursor-not-allowed'} text-base font-bold rounded-xl leading-tight shadow-[0_0_15px_rgba(126,34,206,0.5)] flex flex-col items-center justify-center" style="width:84px;height:112px;">
                        <span class="text-2xl leading-none">🛒</span><span class="mt-1">購買</span>
                    </button>`}
                </div>
            </div>
        </div>
        <p id="pandora-msg" class="text-yellow-300 mt-3 font-bold text-base min-h-8 text-center"></p>
    </div>`;
}

// 購買目前黑市商品（即所見、不附帶詞綴；同一商品於 10 分鐘內可重複購買）
function buyPandoraItem() {
    let m = player.pandoraMarket;
    let msgEl = () => document.getElementById('pandora-msg');
    if (!m || !DB.items[m.id]) { let e = msgEl(); if (e) e.innerHTML = '<span class="text-red-400">商品已不存在。</span>'; return; }
    if ((player.gold || 0) < m.price) { let e = msgEl(); if (e) e.innerHTML = `<span class="text-red-400">金幣不足！需 ${m.price.toLocaleString()} 金幣。</span>`; return; }
    if (m.sold) { let e = msgEl(); if (e) e.innerHTML = '<span class="text-red-400">本輪商品已售出，請等待下次上架。</span>'; return; }
    player.gold -= m.price;
    _tradLootCtx = true;                              // 🏛️ 傳統模式：潘朵拉黑市裝備隨機自帶強化值
    let gi; try { gi = gainItem(m.id, 1, true, false, false); } finally { _tradLootCtx = false; }   // 黑市購買：即所見、不附帶詞綴（try/finally 防殘留洩漏）
    let inst = gi || { id: m.id };
    logSys(`在潘朵拉黑市花費 <span class="text-yellow-300">${m.price.toLocaleString()}</span> 金幣購買了 <span class="${getItemColor(inst)} font-bold">${getItemFullName(inst)}</span>。`);
    m.sold = true;   // 🔧 購買後標記「已售出」：本輪不可再購買，須等 10 分鐘刷新才會上架新商品
    updateUI(); saveGame();
    pandoraRenderMarket(_pandoraDiv);
    let e2 = msgEl(); if (e2) e2.innerHTML = '<span class="text-green-400">購買成功！本輪商品已售出。</span>';
}

// ==========================================
// 修改後的潘朵拉黑市抽獎主程式 (支援抽獎卷與大獎特效版)
// ==========================================
function doPandoraGacha() {
    if (gachaRolling) return;
    
    let cost = shopPrice(30000); // 金幣消耗（攻城獲勝期間 8 折）
    let ticketId = "new_item_239"; // 潘朵拉抽獎卷的 ID
    let usedTicket = false;
    
    // 1. 判斷是否有抽獎卷 (假設玩家背包為 player.inv 陣列，請依實際情況調整)
    let ticketIndex = player.inv.findIndex(i => i.id === ticketId);
    let hasTicket = (ticketIndex !== -1 && player.inv[ticketIndex].cnt > 0);

    if (hasTicket) {
        // 優先消耗抽獎卷
        player.inv[ticketIndex].cnt -= 1;
        if (player.inv[ticketIndex].cnt <= 0) {
            player.inv.splice(ticketIndex, 1); // 數量歸零時從背包移除
        }
        usedTicket = true;
    } else {
        // 沒有抽獎卷才消耗金幣
        if (player.gold < cost) {
            document.getElementById('gacha-msg').innerHTML = `<span class="text-red-400">潘朵拉抽獎卷與金幣皆不足！(需 ${cost} 金幣)</span>`;
            return;
        }
        player.gold -= cost;
    }

    // 紀錄這次花費了什麼，用於最後的廣播訊息
    let costText = usedTicket ? "1 張潘朵拉抽獎卷" : `${cost} 金幣`;

    // 扣款後【立刻存檔】
    updateUI(); 
    saveGame(); 
    
    refreshGachaTicketCount();

    // 🔧 修復：結果在扣款後「立即」結算入包並存檔，動畫純為展示。
    // 原本結算寫在動畫回呼內：動畫期間切換面板會令 getElementById 取得 null 而拋錯，
    // gachaRolling 永遠無法復位 → 單抽/十連按鈕全部失效；且扣款後關頁會付費未取貨。
    let finalId = getWeightedGachaResult();
    _tradLootCtx = true;                                         // 🏛️ 傳統模式：潘朵拉抽獎裝備隨機自帶強化值
    let gainedItem; try { gainedItem = gainItem(finalId, 1, false, false, true); } finally { _tradLootCtx = false; }   // 潘朵拉：詞綴維持舊制（各1%）（try/finally 防殘留洩漏）
    if (!gainedItem) gainedItem = { id: finalId, en: 0, bless: false, anc: false, attr: false, cnt: 1 };
    saveGame();

    gachaRolling = true;
    let btn = document.getElementById('btn-gacha');
    btn.disabled = true;
    btn.classList.remove('hover:scale-105');
    document.getElementById('gacha-msg').innerHTML = '<span class="text-slate-300">命運的齒輪開始轉動...</span>';
    document.getElementById('gacha-name').classList.add('hidden');
    
    // 👇 特效重置：確保每次拉霸前，把框線恢復成原本的「紫色」
    let gachaBox = document.getElementById('gacha-display');
    gachaBox.classList.remove('border-yellow-400', 'shadow-[0_0_60px_rgba(250,204,21,0.8)]', 'animate-pulse');
    gachaBox.classList.add('border-purple-700', 'shadow-[0_0_30px_rgba(126,34,206,0.6)]');
    
    let displayIcon = document.getElementById('gacha-icon');
    let itemIds = Object.keys(DB.items);
    
    let rollCount = 0;
    let rollInterval = setInterval(() => {
        if (!displayIcon.isConnected) {   // 🔧 面板已被切換/覆寫：中止動畫並復位（獎品已入包、已存檔）
            clearInterval(rollInterval);
            gachaRolling = false;
            return;
        }
        // 動畫期間：繼續保持完全隨機展示，營造期待感
        let randomTempId = itemIds[Math.floor(Math.random() * itemIds.length)];
        let tempImg = getIconUrl(DB.items[randomTempId]);
        displayIcon.innerHTML = `<img src="${tempImg}" onerror="this.src='https://placehold.co/100x100/1e293b/ffffff?text=?';" class="w-24 h-24 object-contain opacity-60">`;
        rollCount++;
        
        if (rollCount > 15) { 
            clearInterval(rollInterval);
            
            // 🔧 獎品已於動畫前結算（finalId/gainedItem 由外層閉包帶入），此處僅做展示
            let d = DB.items[gainedItem.id] || DB.items[finalId];
            let finalImg = getIconUrl(d);
            let glowClass = getGlowClass(gainedItem, d);
            
            let fullName = getItemFullName(gainedItem);
            let colorClass = getItemColor(gainedItem);
            let nameBox = document.getElementById('gacha-name');
            nameBox.innerHTML = `<span class="${colorClass}">${fullName}</span>`;
            nameBox.classList.remove('hidden');

            // 🌟🌟🌟 判斷是否為「傳說大獎」 (權重等於 1) 🌟🌟🌟
            let isJackpot = (d.gachaWeight === 1);

            if (isJackpot) {
                // 1. 外框變色：移除紫色，換上閃爍的「金色強光」
                gachaBox.classList.remove('border-purple-700', 'shadow-[0_0_30px_rgba(126,34,206,0.6)]');
                gachaBox.classList.add('border-yellow-400', 'shadow-[0_0_60px_rgba(250,204,21,0.8)]', 'animate-pulse');

                // 2. 圖片特效：稍微放大一點，加上 bounce (彈跳) 動畫與極亮的光暈
                displayIcon.innerHTML = `<img src="${finalImg}" onerror="this.src='https://placehold.co/100x100/1e293b/ffffff?text=?';" class="w-32 h-32 object-contain ${glowClass} drop-shadow-[0_0_25px_rgba(255,255,255,1)] animate-bounce">`;
                
                // 3. 專屬誇張文字
                document.getElementById('gacha-msg').innerHTML = `🌟 <span class="text-yellow-300 font-extrabold text-2xl drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]">傳說降臨！</span> 獲得 <span class="${colorClass} text-2xl font-bold">${fullName}</span>！🌟`;
                
                // 4. ✨ 全螢幕白光閃爍特效 ✨ (經典抽卡特效)
                let flash = document.createElement('div');
                flash.className = 'fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-1000 ease-out';
                document.body.appendChild(flash);
                // 觸發重繪後立刻開始淡出
                void flash.offsetWidth; 
                flash.style.opacity = '0';
                setTimeout(() => flash.remove(), 1000); // 1秒後刪除該白光元素

                // 5. 系統廣播更具儀式感
                logSys(`【系統廣播】一道金光劃破天際！玩家在黑市幸運抽中了傳說級的 <span class="${colorClass} font-bold">${fullName}</span>！`);

            } else {
                // 一般獎品的原本顯示方式
                displayIcon.innerHTML = `<img src="${finalImg}" onerror="this.src='https://placehold.co/100x100/1e293b/ffffff?text=?';" class="w-28 h-28 object-contain ${glowClass} drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">`;
                document.getElementById('gacha-msg').innerHTML = `恭喜獲得 <span class="${colorClass} text-xl">${fullName}</span>！`;
                // 動態顯示花費了什麼
                logSys(`在潘朵拉黑市花費 ${costText}，抽中了 <span class="${colorClass} font-bold">${fullName}</span>！`);
            }
            
            gachaRolling = false;
            btn.disabled = false;
            btn.classList.add('hover:scale-105');
            
            refreshGachaTicketCount();   // 依現有卷數重新判斷按鈕該顯示金幣抽或抽獎卷抽（獎品已於動畫前存檔）
        }
    }, 80); 
}

// 10 連抽：10 格同時旋轉，一次抽 10 樣（每樣各自 1% 機率帶屬性/遠古/祝福詞綴）
function doPandoraGacha10() {
    if (gachaRolling) return;
    let ticketId = "new_item_239";
    let cost = shopPrice(300000);
    let usedTicket = false;
    let ticketIndex = player.inv.findIndex(i => i.id === ticketId);
    let ticketCnt = (ticketIndex !== -1) ? player.inv[ticketIndex].cnt : 0;

    if (ticketCnt >= 10) {
        player.inv[ticketIndex].cnt -= 10;
        if (player.inv[ticketIndex].cnt <= 0) player.inv.splice(ticketIndex, 1);
        usedTicket = true;
    } else if (player.gold >= cost) {
        player.gold -= cost;
    } else {
        document.getElementById('gacha-msg').innerHTML = `<span class="text-red-400">10 連抽需要 10 張潘朵拉抽獎卷，或 ${cost} 金幣！</span>`;
        return;
    }
    let costText = usedTicket ? "10 張潘朵拉抽獎卷" : `${cost} 金幣`;

    updateUI();
    saveGame();
    refreshGachaTicketCount();

    // 🔧 修復：10 件獎品於動畫前一次結算入包並存檔，動畫純為展示（理由同單抽）
    let results = [];
    _tradLootCtx = true;                                  // 🏛️ 傳統模式：潘朵拉十連裝備隨機自帶強化值
    try {
        for (let k = 0; k < 10; k++) {
            let fid = getWeightedGachaResult();
            let gi = gainItem(fid, 1, false, false, true);   // 潘朵拉10連：詞綴維持舊制（各1%）
            if (!gi) gi = { id: fid, en: 0, bless: false, anc: false, attr: false, cnt: 1 };
            results.push(gi);
        }
    } finally { _tradLootCtx = false; }   // try/finally 防殘留洩漏
    saveGame();

    gachaRolling = true;
    let btn = document.getElementById('btn-gacha10');
    btn.disabled = true;
    btn.classList.remove('hover:scale-105');
    document.getElementById('gacha-msg').innerHTML = '<span class="text-slate-300">命運的齒輪開始轉動...</span>';
    document.getElementById('gacha10-results').innerHTML = '';

    let iconEls = Array.from(document.querySelectorAll('.gacha10-icon'));
    iconEls.forEach(el => {
        let cell = el.parentElement;
        cell.classList.remove('border-yellow-400', 'animate-pulse');
        cell.classList.add('border-purple-700');
    });

    let itemIds = Object.keys(DB.items);
    let rollCount = 0;
    let rollInterval = setInterval(() => {
        if (!iconEls.length || !iconEls[0].isConnected) {   // 🔧 面板已被切換/覆寫：中止動畫並復位（獎品已入包、已存檔）
            clearInterval(rollInterval);
            gachaRolling = false;
            return;
        }
        // 10 格同時隨機展示（與單抽相同的旋轉呈現）
        iconEls.forEach(el => {
            let rid = itemIds[Math.floor(Math.random() * itemIds.length)];
            let img = getIconUrl(DB.items[rid]);
            el.innerHTML = `<img src="${img}" onerror="this.src='https://placehold.co/100x100/1e293b/ffffff?text=?';" class="w-full h-full object-contain opacity-60">`;
        });
        rollCount++;

        if (rollCount > 15) {
            clearInterval(rollInterval);

            // 🔧 獎品已於動畫前結算（results 由外層閉包帶入），此處僅做展示
            let jackpotNames = [];
            results.forEach((gi, k) => {
                let d = DB.items[gi.id];
                let img = getIconUrl(d);
                let glow = getGlowClass(gi, d);
                let el = iconEls[k];
                if (!el) return;
                el.innerHTML = `<img src="${img}" onerror="this.src='https://placehold.co/100x100/1e293b/ffffff?text=?';" class="w-full h-full object-contain ${glow}">`;
                if (d.gachaWeight === 1) {   // 傳說大獎：該格金框高亮
                    let cell = el.parentElement;
                    cell.classList.remove('border-purple-700');
                    cell.classList.add('border-yellow-400', 'animate-pulse');
                    jackpotNames.push(getItemFullName(gi));
                }
            });

            // 結果清單（10 個彩色名稱）
            document.getElementById('gacha10-results').innerHTML =
                results.map(gi => `<span class="${getItemColor(gi)}">${getItemFullName(gi)}</span>`).join('、');

            if (jackpotNames.length > 0) {
                document.getElementById('gacha-msg').innerHTML = `🌟 <span class="text-yellow-300 font-extrabold text-xl drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]">傳說降臨！</span> 本次 10 連抽出 ${jackpotNames.length} 件傳說！`;
                let flash = document.createElement('div');
                flash.className = 'fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-1000 ease-out';
                document.body.appendChild(flash);
                void flash.offsetWidth;
                flash.style.opacity = '0';
                setTimeout(() => flash.remove(), 1000);
                jackpotNames.forEach(nm => logSys(`【系統廣播】一道金光劃破天際！玩家在黑市 10 連抽中抽中了傳說級的 <span class="text-yellow-300 font-bold">${nm}</span>！`));
            } else {
                document.getElementById('gacha-msg').innerHTML = `恭喜完成 10 連抽，獲得 10 件物品！`;
            }
            logSys(`在潘朵拉黑市花費 ${costText} 進行 10 連抽，獲得 10 件物品。`);

            gachaRolling = false;
            btn.disabled = false;
            btn.classList.add('hover:scale-105');
            refreshGachaTicketCount();   // 依現有卷數重新判斷按鈕該顯示金幣抽或抽獎卷抽（獎品已於動畫前存檔）
        }
    }, 80);
}

/* ===== 玩家自訂名稱：點擊左上狀態欄名稱 → 輸入框 → 確認 ===== */
function startEditName() {
    if (window._editingName || !player.cls) return;
    window._editingName = true;
    let el = document.getElementById('st-class');
    let cur = (player.name || '').replace(/"/g, '&quot;');
    el.innerHTML = `<input id="name-edit-input" type="text" maxlength="12" value="${cur}" `
        + `onclick="event.stopPropagation()" `
        + `onkeydown="if(event.key==='Enter'){event.preventDefault();confirmEditName();}else if(event.key==='Escape'){cancelEditName();}" `
        + `class="w-24 px-1 py-0.5 text-black text-sm rounded align-middle"> `
        + `<button onclick="event.stopPropagation();confirmEditName()" class="text-green-400 font-bold align-middle">✓</button>`;
    let input = document.getElementById('name-edit-input');
    if (input) { input.focus(); input.select(); }
}
function confirmEditName() {
    let input = document.getElementById('name-edit-input');
    let v = input ? input.value.trim() : '';
    v = v.replace(/[<>&"']/g, '');   // 🔧 過濾 HTML 特殊字元：名稱會以 innerHTML 呈現，避免自我注入標籤
    player.name = v ? v.slice(0, 12) : null;   // 留空則回到未取名狀態（顯示「點擊取名」）
    window._editingName = false;
    updateUI();
    saveGame();
}
function cancelEditName() {
    window._editingName = false;
    updateUI();
}

window.onload = () => {
    migrateSaves();
    if (anySaveExists()) document.getElementById('btn-load').classList.remove('hidden');
    try { _applyVfxPref(); } catch (e) {}   // 🎚️ 套用標題畫面的「戰鬥特效開關」偏好（持久化於 localStorage）
};

/* ===== 城鎮商店/製作介面：游標移到物品圖片上顯示物品資訊（tooltip） ===== */
(function(){
    let tipEl = null, ICON2ID = null;
    const TYPE_LABEL = { wpn:'武器', arm:'防具', acc:'飾品', scroll:'卷軸', pot:'藥水', skillbk:'魔法書', etc:'道具', material:'素材' };
    const STAT_LABEL = { ac:'AC', mr:'魔防(MR)', dr:'傷害減免', er:'迴避(ER)', str:'力量', dex:'敏捷', con:'體質', int:'智力', wis:'精神', cha:'魅力', mhp:'HP上限', mmp:'MP上限', hpR:'HP恢復', mpR:'MP恢復', resFire:'火屬性抗性', resWater:'水屬性抗性', resEarth:'地屬性抗性', resWind:'風屬性抗性', meleeHit:'近距離命中', rangedHit:'遠距離命中', meleeDmg:'近距離傷害', rangedDmg:'遠距離傷害', mdmg:'魔法傷害', extraHit:'額外命中', extraDmg:'額外傷害' };
    const EFF_LABEL = { moonburst:'月光爆裂', pierce:'穿透', dice_death:'即死', haste:'自我加速', immStone:'免疫石化', mp_drain:'命中恢復MP', crush:'重擊', cleave:'切割' };
    function sgn(v){ return (v>=0?'+':'') + v; }
    function buildMap(){ ICON2ID = {}; for(let id in DB.items){ let d = DB.items[id]; if(d) ICON2ID[getIconUrl(d)] = id; } }
    function getTip(){ if(!tipEl){ tipEl = document.createElement('div'); tipEl.className = 'game-tooltip'; document.body.appendChild(tipEl); } return tipEl; }
    function hideTip(){ if(tipEl) tipEl.style.display = 'none'; }
    // ===== 技能 tooltip（技能頁：游標移到技能上顯示能力）=====
    const SK_TYPE = { atk:'攻擊', heal:'治癒', buff:'增益', manual:'手動', convert:'轉換', summon:'召喚' };
    const SK_ELE = { fire:'火', water:'水', earth:'地', wind:'風', none:'無' };
    const SK_STAT2 = { ac:'AC', mr:'魔防', dr:'傷害減免', er:'迴避', str:'力量', dex:'敏捷', con:'體質', int:'智力', wis:'精神', cha:'魅力', extraDmg:'額外傷害', extraHit:'額外命中', magicDmg:'魔法傷害', extraMp:'額外MP', mpR:'MP恢復', hpR:'HP恢復', meleeHit:'近距命中', rangedHit:'遠距命中', meleeDmg:'近距傷害', rangedDmg:'遠距傷害', resFire:'火屬性抗性', resWater:'水屬性抗性', resEarth:'地屬性抗性', resWind:'風屬性抗性' };
    const SK_MEFF = { teleport:'瞬間移動', sense:'能量感測', recall:'回村', charm:'迷魅', barrier:'隔絕無敵（無法攻擊/施法/用道具・不受任何傷害・不自然恢復）' };
    function buildSkillTipHTML(sid){
        let sk = DB.skills[sid]; if(!sk) return '';
        let tc = sk.type==='atk'?'text-cyan-300':(sk.type==='heal'?'text-green-300':(sk.type==='manual'?'text-amber-300':'text-purple-300'));
        let parts = [];
        parts.push(`<div class="font-bold text-base ${tc}" style="margin-bottom:2px;">${sk.n}</div>`);
        parts.push(`<div class="text-slate-400" style="font-size:11px;margin-bottom:4px;">${SK_TYPE[sk.type]||'技能'}${sk.tier?(' ・ 第'+sk.tier+'階'):''}</div>`);
        let meta = [];
        let needLv = (typeof skillReqLv==='function') ? skillReqLv(sk, sid) : undefined;
        if(needLv !== undefined) meta.push('需求 Lv.'+needLv);
        { let _costs = []; if(sk.hpCost) _costs.push('HP '+sk.hpCost); if(sk.mp) _costs.push('MP '+sk.mp); if(_costs.length) meta.push('消耗 '+_costs.join('、')); }   // 🐉 同時消耗 HP＋MP 的技能(覺醒/冥想/隱身/堅固防護/幻術士混亂等)：兩者並列顯示
        if(sk.dur) meta.push('持續 '+sk.dur+' 秒');
        if(sk.cd) meta.push('冷卻 '+(sk.cd/10)+' 秒');
        if(meta.length) parts.push(`<div class="text-slate-300">${meta.join(' ・ ')}</div>`);
        let eff = [];
        if(sk.dmgDice) eff.push((sk.target==='all'?'範圍':'')+'傷害 '+sk.dmgDice[0]+'d'+sk.dmgDice[1]+(sk.ele&&sk.ele!=='none'?'（'+SK_ELE[sk.ele]+'屬）':''));
        if(sk.multiDmg) eff.push('多段傷害 '+sk.multiDmg.map(function(x){return x[0]+'d'+x[1];}).join('＋')+(sk.ele&&sk.ele!=='none'?'（'+SK_ELE[sk.ele]+'屬）':''));
        if(sk.healBase || sk.healDice) eff.push('治療 '+(sk.healBase||0)+(sk.healDice?('＋'+sk.healDice[0]+'d'+sk.healDice[1]):''));
        if(sk.lifesteal) eff.push('吸取生命');
        if(sk.instakill) eff.push('即死（不死系）');
        if(sk.status) eff.push('附加：'+(STATUS_NAME[sk.status.kind]||sk.status.kind));
        if(sk.summon) eff.push('召喚協力單位');
        if(sk.mEff) eff.push(SK_MEFF[sk.mEff]||'特殊效果');
        if(sk.darkPoison) eff.push('一般攻擊命中 50% 機率使目標中毒：每秒該次攻擊 60% 傷害、持續 5 秒、最多 1 層（取較高傷害並刷新；劇毒精通→100%、每秒 200%）');
        if(sk.d && typeof sk.d==='object'){
            let dd = sk.d, s = [], _resK = ['resFire','resWater','resEarth','resWind'];
            if(dd.resFire && dd.resFire===dd.resWater && dd.resFire===dd.resEarth && dd.resFire===dd.resWind){
                s.push('全屬性抗性'+sgn(dd.resFire));   // 🔧 四屬性抗性相同 → 合併為「全屬性抗性」
                for(let k in dd){ if(_resK.indexOf(k)===-1) s.push((SK_STAT2[k]||k)+sgn(dd[k])); }
            } else {
                for(let k in dd){ s.push((SK_STAT2[k]||k)+sgn(dd[k])); }
            }
            if(s.length) eff.push(s.join('、'));
        }
        if(eff.length) parts.push(`<div class="text-rose-300" style="font-size:12px;">${eff.join(' ／ ')}</div>`);
        if(sk.msg) parts.push(`<div class="text-slate-400" style="font-size:11px;margin-top:4px;">${sk.msg}</div>`);
        return parts.join('');
    }
    function buildItemTipHTML(id){
        let d = DB.items[id]; if(!d) return '';
        let nameColor = getItemColor({ id });
        let parts = [];
        parts.push(`<div class="font-bold text-base ${nameColor}" style="margin-bottom:2px;">${d.n}</div>`);
        let tl = TYPE_LABEL[d.type] || '道具';
        if(d.type === 'wpn'){ if(d.isBow) tl += '（弓）'; else if(d.w2h) tl += '（雙手）'; }
        parts.push(`<div class="text-slate-400" style="font-size:11px;margin-bottom:4px;">${tl}</div>`);
        if(d.type === 'wpn'){
            let ranged = (d.ranged === true);
            parts.push(`<div class="text-orange-300">小型傷害 ${d.dmgS} / 大型傷害 ${d.dmgL}</div>`);
            let ex = [];
            if(d.hit) ex.push(`${ranged?'遠距':'近距'}命中 ${sgn(d.hit)}`);
            if(d.dmgBonus !== undefined && d.dmgBonus !== 0) ex.push(`${ranged?'遠距':'近距'}傷害 ${sgn(d.dmgBonus)}`);
            if(d.mdmg) ex.push(`魔法傷害 ${sgn(d.mdmg)}`);
            if(ex.length) parts.push(`<div class="text-slate-300">${ex.join(' / ')}</div>`);
        } else if(d.type === 'arm' || d.type === 'acc'){
            let st = [];
            ['ac','mr','dr','er','str','dex','con','int','wis','cha','mhp','mmp','hpR','mpR','resFire','resWater','resEarth','resWind','meleeHit','rangedHit','meleeDmg','rangedDmg','mdmg','extraHit','extraDmg'].forEach(k => {
                if(d[k] !== undefined && d[k] !== 0) st.push(`${STAT_LABEL[k]||k} ${sgn(k === 'ac' ? -d[k] : d[k])}`);   // 🔧 AC 顯示取負（ac:3 ＝ 防禦 AC-3，越低越好），與背包資訊欄一致
            });
            if(st.length) parts.push(`<div class="text-slate-300">${st.join(' / ')}</div>`);
        } else if(d.type === 'skillbk' && d.sk && DB.skills[d.sk]){
            parts.push(`<div class="text-purple-300">習得技能：${DB.skills[d.sk].n}</div>`);
        }
        if(d.type === 'wpn' || d.type === 'arm' || d.type === 'acc'){
            let _eff = [];
            if(d.unBonus || d.unDice || d.sp === 'elf') _eff.push('不死 / 狼人加成');
            if(d.eff === 'pierce')     _eff.push('穿透' + (d.pierceChance !== undefined ? ' ' + d.pierceChance + '%' : ''));
            if(d.eff === 'moonburst')  _eff.push('月光爆裂');
            if(d.eff === 'dice_death') _eff.push('即死');
            if(d.eff === 'haste')      _eff.push('自我加速');
            if(d.eff === 'crush')      _eff.push('重擊');
            if(d.eff === 'cleave')     _eff.push('切割');
            if(d.eff === 'combo')      _eff.push('雙擊 ' + (d.comboRate||0) + '%');   // 🔧 鋼爪/雙刀：雙擊特效（comboRate%機率發動，額外攻擊＝完整一般攻擊）
            if(d.weakExpose)           _eff.push('弱點曝光');   // 🐉 鎖鏈劍
            if(d.vampPct)              _eff.push('吸取HP ' + Math.round(d.vampPct * 100) + '%');   // 🐉 嗜血者鎖鏈劍
            if(d.ignHardSkin)          _eff.push('貫穿');   // 🗡️ 暗黑十字弓：攻擊無視硬皮額外減傷
            if(d.redSpecter)           _eff.push('紅惡靈逆襲');   // 👹 隱藏的魔族武器
            if(d.blueSpecter)          _eff.push('藍惡靈奪魔');   // 👹 隱藏的魔族武器
            if(d.block)                _eff.push('格檔：' + d.block + '%');
            if(d.eff === 'magicburst') _eff.push('魔爆');
            if(d.eff === 'mp_drain' || d.mpOnHit)   _eff.push('命中恢復MP');
            if(d.immStone)             _eff.push('免疫石化');
            if(d.immPoison)            _eff.push('免疫中毒');
            if(d.unique)               _eff.push('唯一（最多裝備1個）');
            // 🏹 與背包資訊欄一致補齊：弓連射 / 魔杖共鳴・魔擊 / 蕾雅冰裂術 / 附魔施放（經典模式由 filterClassicEffLabels 過濾停用者）
            if(d.rapidfire)            _eff.push('連射 ' + d.rapidfire + '%');
            if(d.eff === 'magicstrike') _eff.push('魔擊');
            if(d.meleeHitSpell)        _eff.push(d.meleeHitSpell.skn || '命中觸發');
            if(d.spellProc)            _eff.push('施放' + (d.spellProc.skn || ''));
            if(d.procSkill)            _eff.push('施放' + ((DB.skills[d.procSkill] && DB.skills[d.procSkill].n) || ''));
            if(typeof WAND_LIGHTARROW_IDS !== 'undefined' && WAND_LIGHTARROW_IDS.includes(id)) _eff.push('共鳴');
            // 🔧 武器標籤特效（反擊/居合/鈍擊/出血）：來自 WEAPON_TAGS（非 eff 欄位），與背包資訊欄一致顯示
            if(d.type === 'wpn' && typeof getWeaponTags === 'function'){
                if(typeof weaponHasBleed === 'function' && weaponHasBleed(id)) _eff.push('出血');
                let _tg = getWeaponTags(id);
                if(_tg.includes('單手劍'))   _eff.push('反擊');
                if(_tg.includes('武士刀'))   _eff.push('居合');
                if(_tg.includes('單手鈍器')) _eff.push('鈍擊');
            }
            _eff = filterClassicEffLabels(_eff);   // 🎮 經典模式：移除已停用特效字樣
            if(_eff.length) parts.push(`<div class="text-rose-300 font-bold" style="font-size:12px;">特效：${_eff.join(' / ')}</div>`);
        }
        if(typeof d.p === 'number' && d.p > 0) parts.push(`<div class="text-yellow-400" style="font-size:12px;">售價 ${d.p.toLocaleString()} 金幣</div>`);
        if(d.d) parts.push(`<div class="text-slate-400" style="font-size:11px;margin-top:4px;">${d.d}</div>`);
        return parts.join('');
    }
    // 取出 hover 物品的實例（倉庫或背包），供倉庫等以實例顯示的清單使用
    function findTipItem(src, uidv){
        try {
            if(src === 'wh'){ let w = loadWarehouse(); return ((w && w.items) || []).find(x => x.uid === uidv) || null; }
            return (player.inv || []).find(x => x.uid === uidv) || null;
        } catch(e){ return null; }
    }
    document.addEventListener('mousemove', function(e){
        let host = e.target && e.target.closest ? e.target.closest('.tip-host') : null;
        let ic = document.getElementById('interaction-content');
        let eb = document.getElementById('equip-book');
        // 技能頁 host（data-tip-skill）與收集冊 host（data-tip-id）不限於 NPC 互動面板；其餘 host 仍限定於 interaction-content
        let ok = host && ((ic && ic.contains(host)) || (eb && !eb.classList.contains('hidden') && eb.contains(host)) || host.hasAttribute('data-tip-skill') || host.hasAttribute('data-tip-id'));
        if(!ok){ hideTip(); return; }
        let el = getTip();
        let tSkill = host.getAttribute('data-tip-skill');
        let tUid = host.getAttribute('data-tip-uid');
        let tId = host.getAttribute('data-tip-id');
        if(tSkill){
            // 技能頁：依技能 ID 顯示能力
            if(el._id !== 'SK:'+tSkill){ let h = buildSkillTipHTML(tSkill); if(!h){ hideTip(); return; } el.innerHTML = h; el._id = 'SK:'+tSkill; }
        } else if(tUid){
            // 實例物品（倉庫/背包清單）：顯示完整資訊（含 +N、詞綴、套裝效果）
            let tSrc = host.getAttribute('data-tip-src') || 'inv';
            let key = 'I:' + tSrc + ':' + tUid;
            if(el._id !== key){
                let it = findTipItem(tSrc, tUid);
                if(!it){ hideTip(); return; }
                el.innerHTML = `<div class="font-bold text-base ${getItemColor(it)}" style="margin-bottom:4px;">${getItemFullName(it)}</div>`
                    + `<div class="text-slate-300" style="font-size:12px;line-height:1.5;">${buildItemDescHTML(it)}</div>`;
                el._id = key;
            }
        } else if(tId){
            // 🗡️ 收集冊：依基底物品 ID 顯示資訊（已收集裝備）
            if(el._id !== ('BID:'+tId)){ let h = buildItemTipHTML(tId); if(!h){ hideTip(); return; } el.innerHTML = h; el._id = 'BID:'+tId; }
        } else {
            // 商店/製作圖示：依 icon → 基底物品 ID 顯示
            if(!ICON2ID) buildMap();
            let img = host.querySelector('img');
            let src = img ? img.getAttribute('src') : null;
            let id = src ? ICON2ID[src] : null;
            if(!id){ hideTip(); return; }
            if(el._id !== id){ el.innerHTML = buildItemTipHTML(id); el._id = id; }
        }
        el.style.display = 'block';
        let pad = 16, w = el.offsetWidth, h = el.offsetHeight;
        let x = e.clientX + pad, y = e.clientY + pad;
        if(x + w > window.innerWidth - 6) x = e.clientX - pad - w;
        if(y + h > window.innerHeight - 6) y = e.clientY - pad - h;
        el.style.left = Math.max(4, x) + 'px';
        el.style.top = Math.max(4, y) + 'px';
    });
    document.addEventListener('mousedown', hideTip);
})();