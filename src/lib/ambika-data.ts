// Auto-generated from the Ambika engine (question_engine.py / adaptive_conversation.py). Do not edit by hand.
export type Loc = Record<string, string>;
export type Followup = { trigger?: string[]; code: string; q: Loc };
export type Question = { code: string; q: Loc; followups?: Followup[] };

export const CONDITION_QSETS: Record<string, Question[]> = {
"pcos": [
{
"code": "period_regularity",
"q": {
"en": "Let's start with your periods — do they come on time, or are they irregular, late, or skipping months?",
"hi": "पीरियड्स से शुरू — समय पर आते हैं, या अनियमित, देर से, या कभी नहीं आते?",
"mr": "पाळीपासून सुरू — वेळेवर येते का, की अनियमित, उशिरा, किंवा येतच नाही?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"irregular",
"अनियमित",
"late",
"skip"
],
"code": "period_pattern_detail",
"q": {
"en": "When you say irregular — do they skip months entirely, or come very late? And how many months has it been like this?",
"hi": "अनियमित मतलब — महीने पूरे छोड़ते हैं, या बहुत देर से आते हैं? कितने महीनों से?",
"mr": "अनियमित म्हणजे — महिने चुकतात, किंवा खूप उशिरा येतात? किती महिन्यांपासून?"
}
}
]
},
{
"code": "period_flow",
"q": {
"en": "When your period does come — is the flow heavy, very light, or does it vary?",
"hi": "जब पीरियड आता है — प्रवाह भारी, बहुत हल्का, या हर बार अलग?",
"mr": "पाळी येते तेव्हा — प्रवाह जड, हलका, किंवा दरवेळी वेगळा?"
},
"followups": [
{
"trigger": [
"heavy",
"भारी",
"lot",
"बहुत",
"jyada"
],
"code": "period_heavy_detail",
"q": {
"en": "How heavy — changing pads every 2 hours, or lasting more than 7 days?",
"hi": "कितना भारी — हर 2 घंटे में पैड बदलना, या 7 दिन से ज़्यादा?",
"mr": "किती जड — दर 2 तासांनी पॅड बदलणे किंवा 7 दिवसांपेक्षा जास्त?"
}
}
]
},
{
"code": "period_color",
"q": {
"en": "What colour is your period blood — bright red, dark brown, almost black, or clotty?",
"hi": "पीरियड का रक्त किस रंग का — चमकदार लाल, गहरा भूरा, काला, या गाँठों के साथ?",
"mr": "पाळीचे रक्त कोणत्या रंगाचे — चमकदार लाल, गडद तपकिरी, काळे, किंवा गुठळ्यांसह?"
},
"followups": [
{
"trigger": [
"dark",
"गहरा",
"brown",
"भूरा",
"black",
"काला",
"clot",
"गांठ"
],
"code": "period_color_detail",
"q": {
"en": "Dark or brownish blood indicates older blood — does this happen at the start, end, or throughout?",
"hi": "गहरा या भूरा रक्त पुराने खून का संकेत है — शुरुआत में, अंत में, या पूरे समय?",
"mr": "गडद रक्त जुन्या रक्ताचे संकेत — सुरुवातीला, शेवटी, किंवा संपूर्ण वेळ?"
}
}
]
},
{
"code": "facial_hair",
"q": {
"en": "Extra hair on your face — chin, upper lip, cheeks — more than before?",
"hi": "चेहरे पर ज़्यादा बाल — ठुड्डी, होंठ, गाल — पहले से ज़्यादा?",
"mr": "चेहऱ्यावर जास्त केस — हनुवटी, वरील ओठ, गाल?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha"
],
"code": "facial_hair_growth",
"q": {
"en": "Is the hair growth getting worse over time — and does it also grow on chest or stomach?",
"hi": "क्या बाल समय के साथ बढ़ रहे हैं — और सीने या पेट पर भी उगते हैं?",
"mr": "केसांची वाढ वाढत आहे का — छाती किंवा पोटावरही येतात का?"
}
}
]
},
{
"code": "weight_gain",
"q": {
"en": "Have you gained weight without trying — without changing your diet?",
"hi": "बिना कोशिश वजन बढ़ा — खान-पान बदले बिना?",
"mr": "प्रयत्नाशिवाय वजन वाढले — जेवणात बदल न करता?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha"
],
"code": "weight_gain_detail",
"q": {
"en": "Roughly how much weight, and over how long? Is it mostly around the belly?",
"hi": "लगभग कितना वजन, और कितने समय में? ज़्यादातर पेट के आसपास है?",
"mr": "किती वजन, किती वेळात? जास्त पोटाभोवती आहे?"
}
}
]
},
{
"code": "acne",
"q": {
"en": "Acne that keeps coming back — face, back, or chest?",
"hi": "बार-बार मुंहासे — चेहरे, पीठ, सीने पर?",
"mr": "वारंवार मुरुमे — चेहऱ्यावर, पाठीवर, छातीवर?"
}
},
{
"code": "dark_patches",
"q": {
"en": "Dark patches on your neck, underarms, or inner thighs?",
"hi": "गर्दन, बगल, या जांघों में काले धब्बे?",
"mr": "मान, काख, मांड्यांवर काळे डाग?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha"
],
"code": "dark_patches_detail",
"q": {
"en": "Are these patches velvety or rough to touch? This is called acanthosis nigricans — linked to insulin resistance.",
"hi": "ये धब्बे मखमली या खुरदरे हैं? इसे एकैंथोसिस निग्रिकन्स कहते हैं — इंसुलिन प्रतिरोध से जुड़ा।",
"mr": "हे डाग मखमली किंवा खडबडीत आहेत? याला अकँथोसिस निग्रिकन्स म्हणतात — इन्सुलिन प्रतिरोधाशी संबंधित."
}
}
]
},
{
"code": "mood_energy",
"q": {
"en": "How has your mood and energy been — low, anxious, or mood swings?",
"hi": "मूड और ऊर्जा कैसी — उदास, चिंतित, या मूड बदलाव?",
"mr": "मूड आणि उर्जा कसा — उदास, काळजीत, मूड बदल?"
}
},
{
"code": "sleep_issues",
"q": {
"en": "Trouble sleeping — difficulty falling asleep or waking in the night?",
"hi": "नींद में परेशानी — सोने में कठिनाई या रात में जागना?",
"mr": "झोपेत अडचण — झोप न लागणे किंवा रात्री जाग येणे?"
}
},
{
"code": "trying_baby",
"q": {
"en": "Have you been trying to conceive? Has it been difficult?",
"hi": "बच्चे के लिए कोशिश कर रही हैं? मुश्किल हो रहा है?",
"mr": "बाळासाठी प्रयत्न करत आहात? अडचण येतेय?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"trying",
"कोशिश",
"प्रयत्न"
],
"code": "fertility_duration",
"q": {
"en": "How long have you been trying? PCOS is one of the most treatable causes of difficulty conceiving.",
"hi": "कितने समय से कोशिश? PCOS गर्भधारण में कठिनाई का सबसे उपचार योग्य कारण है।",
"mr": "किती दिवसांपासून प्रयत्न? PCOS हे गर्भधारणेतील अडचणीचे सर्वात उपचार करण्यायोग्य कारण आहे."
}
}
]
},
{
"code": "scalp_hair",
"q": {
"en": "Is the hair on your scalp thinning — especially at the top or centre?",
"hi": "सिर के बाल पतले हो रहे हैं — ऊपर या बीच में?",
"mr": "डोक्यावरचे केस विरळ होतायत — मध्यभागी?"
}
},
{
"code": "family_pcos",
"q": {
"en": "Does your mother or sister have irregular periods, diabetes, or a hormonal problem?",
"hi": "माँ या बहन को अनियमित पीरियड्स, मधुमेह, या हार्मोनल समस्या?",
"mr": "आई किंवा बहिणीला अनियमित पाळी, मधुमेह, हार्मोनल समस्या?"
}
}
],
"anaemia": [
{
"code": "how_long_anaemia",
"q": {
"en": "How long have you been feeling this way — weeks, months, or longer?",
"hi": "यह तकलीफ कितने समय से — हफ्ते, महीने, या ज़्यादा?",
"mr": "हा त्रास किती दिवसांपासून — आठवडे, महिने, जास्त?"
}
},
{
"code": "pallor",
"q": {
"en": "Has anyone told you recently that you look pale? Or does the inside of your lower eyelid look white, not pink?",
"hi": "किसी ने हाल में कहा पीली लग रही हैं? निचली पलक के अंदर सफेद दिखता है, गुलाबी नहीं?",
"mr": "कोणी सांगितले फिकट दिसता? खालच्या पापणीचा आतील भाग पांढरा दिसतो, गुलाबी नाही?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha",
"white",
"सफेद",
"pale"
],
"code": "pallor_detail",
"q": {
"en": "The pale eyelid is one of the most reliable signs of anaemia. Is the pallor noticeable in your nails and lips too?",
"hi": "पीली पलक एनीमिया का सबसे विश्वसनीय संकेत है। नाखूनों और होंठों में भी पीलापन दिखता है?",
"mr": "फिकट पापणी अशक्तपणाचे सर्वात विश्वसनीय लक्षण आहे. नखे आणि ओठांमध्येही फिकटपणा आहे का?"
}
}
]
},
{
"code": "dizziness",
"q": {
"en": "Dizzy or lightheaded when you stand up quickly?",
"hi": "जल्दी उठने पर चक्कर?",
"mr": "झटपट उठल्यावर चक्कर येते का?"
}
},
{
"code": "breathlessness",
"q": {
"en": "Breathless climbing stairs or walking fast — more than others your age?",
"hi": "सीढ़ी चढ़ने या तेज़ चलने पर सांस फूलती है — अपनी उम्र के लोगों से ज़्यादा?",
"mr": "जिना चढताना दम लागतो — इतरांपेक्षा जास्त?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha"
],
"code": "breathlessness_severity",
"q": {
"en": "How bad — only on stairs, or even on flat ground? Breathless at rest?",
"hi": "कितना — सिर्फ सीढ़ियों पर, या समतल पर भी? आराम में भी सांस फूलती है?",
"mr": "किती तीव्र — फक्त जिन्यावर, की सपाट चालतानाही? विश्रांतीतही दम लागतो?"
}
}
]
},
{
"code": "palpitations",
"q": {
"en": "Heart racing or fluttering — even when resting?",
"hi": "दिल तेज़ या फड़फड़ाता है — आराम में भी?",
"mr": "हृदय वेगाने धडधडते — विश्रांतीतही?"
}
},
{
"code": "pica",
"q": {
"en": "Do you crave unusual things — ice, chalk, clay, or raw rice?",
"hi": "बर्फ, चॉक, मिट्टी, या कच्चे चावल खाने की इच्छा?",
"mr": "बर्फ, खडू, माती, कच्चा तांदूळ खाण्याची इच्छा?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha",
"ice",
"chalk",
"clay"
],
"code": "pica_detail",
"q": {
"en": "Pica — cravings like these — is a classic iron deficiency sign. How strong is the craving?",
"hi": "पाइका — ऐसी इच्छाएं — आयरन की कमी का क्लासिक संकेत। इच्छा कितनी तेज़?",
"mr": "पाइका — अशा इच्छा — लोह कमतरतेचे क्लासिक लक्षण. इच्छा किती तीव्र?"
}
}
]
},
{
"code": "heavy_periods_anaemia",
"q": {
"en": "Very heavy periods — changing pads every 2 hours, or lasting more than 7 days?",
"hi": "बहुत भारी पीरियड — हर 2 घंटे में पैड, या 7 दिन से ज़्यादा?",
"mr": "खूप जड पाळी — दर 2 तासांनी पॅड, किंवा 7 दिवसांपेक्षा जास्त?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha"
],
"code": "heavy_periods_clots",
"q": {
"en": "Do you pass blood clots too? And how many years has it been this heavy?",
"hi": "रक्त गाँठें भी निकलती हैं? और कितने सालों से इतना भारी?",
"mr": "रक्ताच्या गुठळ्याही येतात? आणि किती वर्षांपासून एवढी जड?"
}
}
]
},
{
"code": "gi_bleeding",
"q": {
"en": "Very dark or black stools, or blood in your stools?",
"hi": "बहुत काला मल, या मल में खून?",
"mr": "खूप काळा मल, किंवा मलात रक्त?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha",
"black",
"blood",
"काला",
"खून"
],
"code": "gi_detail",
"q": {
"en": "Dark stools can mean internal bleeding — an important anaemia cause. Is it happening regularly or occasionally?",
"hi": "काला मल आंतरिक रक्तस्राव का संकेत — एनीमिया का महत्वपूर्ण कारण। नियमित है या कभी-कभी?",
"mr": "काळा मल अंतर्गत रक्तस्त्रावाचे संकेत — नियमित होतेय, किंवा कधी कधी?"
}
}
]
},
{
"code": "brittle_nails",
"q": {
"en": "Nails becoming brittle or breaking easily?",
"hi": "नाखून नाज़ुक या आसानी से टूटते हैं?",
"mr": "नखे नाजूक किंवा सहज तुटतात?"
}
},
{
"code": "iron_diet",
"q": {
"en": "How often do you eat iron-rich foods — lentils, spinach, eggs, liver? Daily, a few times, or rarely?",
"hi": "आयरन युक्त खाना — दाल, पालक, अंडे, कलेजी — कितनी बार? रोज़, कुछ बार, या कभी-कभार?",
"mr": "लोह-समृद्ध अन्न — डाळ, पालक, अंडी — किती वेळा? रोज, काही वेळा, क्वचित?"
},
"followups": [
{
"trigger": [
"rarely",
"कभी-कभार",
"क्वचित",
"no",
"नहीं",
"never"
],
"code": "tea_with_meals",
"q": {
"en": "Do you drink tea or coffee right after eating? This blocks up to 60% of iron absorption.",
"hi": "खाने के तुरंत बाद चाय या कॉफी? यह 60% तक आयरन अवशोषण कम कर देता है।",
"mr": "जेवणानंतर लगेच चहा किंवा कॉफी? यामुळे 60% पर्यंत लोह शोषण कमी होते."
}
}
]
},
{
"code": "prior_anaemia",
"q": {
"en": "Ever been told you have anaemia, or given iron tablets or injections?",
"hi": "पहले एनीमिया बताया गया, या आयरन गोलियाँ या इंजेक्शन दिए गए?",
"mr": "पूर्वी अशक्तपणा सांगितला, किंवा लोहाच्या गोळ्या किंवा इंजेक्शन?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha"
],
"code": "prior_treatment_completion",
"q": {
"en": "Did you complete the full course? Stopping iron tablets early is a common reason anaemia comes back.",
"hi": "पूरा कोर्स किया? जल्दी बंद करना एनीमिया वापस आने का आम कारण है।",
"mr": "संपूर्ण कोर्स पूर्ण केला? लोहाच्या गोळ्या लवकर बंद करणे अशक्तपणा परत येण्याचे कारण."
}
}
]
}
],
"hypertension": [
{
"code": "how_long_bp",
"q": {
"en": "How long have you had these headaches — weeks, months, or longer?",
"hi": "सिरदर्द कितने समय से — हफ्ते, महीने, या ज़्यादा?",
"mr": "डोकेदुखी किती दिवसांपासून?"
}
},
{
"code": "headache_pattern",
"q": {
"en": "Describe the headaches — where exactly, and when are they worst? Morning on waking, after stress, or constant?",
"hi": "सिरदर्द बताइए — ठीक कहाँ, कब सबसे ज़्यादा? सुबह उठने पर, तनाव बाद, या लगातार?",
"mr": "डोकेदुखीबद्दल सांगा — नक्की कुठे, कधी सर्वात जास्त? सकाळी, तणावानंतर, किंवा सतत?"
},
"followups": [
{
"trigger": [
"morning",
"सुबह",
"सकाळी",
"back",
"पीछे",
"मागे",
"constant",
"लगातार"
],
"code": "morning_bp_headache",
"q": {
"en": "Morning headaches at the back of the head that ease during the day are a classic high BP sign. Does yours fit that?",
"hi": "सुबह सिर के पीछे का दर्द जो दिन में कम होता है — हाई बीपी का क्लासिक संकेत। क्या आपका ऐसा है?",
"mr": "सकाळी डोक्याच्या मागे दुखणे जे दिवसात कमी होते — उच्च रक्तदाबाचे क्लासिक संकेत. तुमचे असेच?"
}
}
]
},
{
"code": "bp_known_high",
"q": {
"en": "Have you ever been told your blood pressure is high?",
"hi": "कभी बताया गया बीपी ज़्यादा है?",
"mr": "कधी सांगितले रक्तदाब जास्त आहे?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha"
],
"code": "bp_medication",
"q": {
"en": "Are you on BP medicine currently, and are you taking it regularly?",
"hi": "अभी बीपी दवाई ले रही हैं, और नियमित ले रही हैं?",
"mr": "सध्या रक्तदाबाची औषधे घेता, आणि नियमित घेता?"
}
}
]
},
{
"code": "vision_symptoms",
"q": {
"en": "Blurred vision, seeing spots or lights, or double vision — especially with headaches?",
"hi": "धुंधला दिखना, धब्बे, या दोहरा दिखना — खासकर सिरदर्द के साथ?",
"mr": "अंधुक दिसणे, ठिपके, किंवा दुहेरी दृष्टी — डोकेदुखीसोबत?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha",
"blur",
"धुंधला"
],
"code": "vision_detail",
"q": {
"en": "Any sudden worsening of vision or temporary loss of vision? High BP can damage blood vessels in the eye.",
"hi": "अचानक दृष्टि बिगड़ना या अस्थायी रूप से दिखना बंद? हाई बीपी आँखों की नसें खराब कर सकता है।",
"mr": "दृष्टी अचानक बिघडणे किंवा तात्पुरते न दिसणे? उच्च रक्तदाब डोळ्यांच्या रक्तवाहिन्यांना नुकसान करू शकतो."
}
}
]
},
{
"code": "chest_symptoms",
"q": {
"en": "Chest tightness, pressure, or heart racing — at rest or during activity?",
"hi": "सीने में कसाव, दबाव, या दिल तेज़ धड़कना — आराम में या गतिविधि में?",
"mr": "छातीत घट्टपणा, दाब, हृदय वेगाने धडधडणे?"
}
},
{
"code": "salt_stress",
"q": {
"en": "Do you eat a lot of salty food — pickles, papads, packaged food? And how is your stress level?",
"hi": "ज़्यादा नमकीन — अचार, पापड़, पैकेज्ड खाना? और तनाव कैसा है?",
"mr": "जास्त खारट जेवण — लोणचे, पापड? आणि तणाव कसा आहे?"
}
},
{
"code": "family_bp",
"q": {
"en": "Family history — parents or siblings with high BP or heart disease?",
"hi": "परिवार में — माँ-बाप या भाई-बहन को हाई बीपी या दिल की बीमारी?",
"mr": "कुटुंबात — उच्च रक्तदाब किंवा हृदयरोग?"
}
}
],
"endometriosis": [
{
"code": "endo_duration",
"q": {
"en": "How long have you had this period pain — and has it gotten worse over time?",
"hi": "पीरियड दर्द कितने समय से — और समय के साथ बढ़ा है?",
"mr": "पाळीचे दुखणे किती दिवसांपासून — आणि वाढले का?"
}
},
{
"code": "period_pain_severity",
"q": {
"en": "On worst days — scale of 1 to 10, how bad? Does it stop you working or going to school?",
"hi": "सबसे बुरे दिनों में — 1 से 10 पैमाने पर, कितना? काम या स्कूल रुकता है?",
"mr": "सर्वात वाईट दिवसांत — 1 ते 10, किती? काम किंवा शाळा थांबते?"
},
"followups": [
{
"trigger": [
"7",
"8",
"9",
"10",
"severe",
"bad",
"stop",
"बहुत",
"रुकता",
"थांबते"
],
"code": "pain_medication",
"q": {
"en": "Do you take painkillers — and do they work? Period pain that doesn't respond to normal painkillers is a red flag for endometriosis.",
"hi": "दर्द-निवारक लेती हैं — असर होता है? सामान्य दर्दनाशक से ठीक न हो — एंडोमेट्रियोसिस का लाल झंडा।",
"mr": "वेदनाशामक घेता — फरक पडतो? सामान्य वेदनाशामकांनी बरी न होणे — एंडोमेट्रिओसिसचा लाल झेंडा."
}
}
]
},
{
"code": "pelvic_pain_outside",
"q": {
"en": "Pain in lower belly or pelvis even when NOT on your period?",
"hi": "पीरियड के बाहर भी पेट के नीचे या श्रोणि में दर्द?",
"mr": "पाळी नसतानाही खालच्या पोटात किंवा ओटीपोटात दुखणे?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha"
],
"code": "pelvic_timing",
"q": {
"en": "Is it constant, or does it come and go? Does it get worse before your period starts?",
"hi": "लगातार है, या आता-जाता है? पीरियड शुरू होने से पहले बढ़ता है?",
"mr": "सतत असते, किंवा येते-जाते? पाळी सुरू होण्यापूर्वी वाढते?"
}
}
]
},
{
"code": "period_flow_endo",
"q": {
"en": "Heavy periods lasting more than 7 days? What colour is the blood — bright red, dark, or brownish?",
"hi": "7 दिन से ज़्यादा भारी पीरियड? रक्त का रंग — चमकदार लाल, गहरा, या भूरा?",
"mr": "7 दिवसांपेक्षा जास्त जड पाळी? रक्त कोणत्या रंगाचे — चमकदार लाल, गडद, तपकिरी?"
},
"followups": [
{
"trigger": [
"dark",
"गहरा",
"brown",
"भूरा",
"काला",
"black",
"गडद"
],
"code": "endo_blood_color",
"q": {
"en": "Dark or brown blood — called old blood — is very characteristic of endometriosis. Do you also pass clots?",
"hi": "गहरा या भूरा रक्त — पुराना खून — एंडोमेट्रियोसिस की पहचान है। रक्त गाँठें भी निकलती हैं?",
"mr": "गडद किंवा तपकिरी रक्त — जुने रक्त — एंडोमेट्रिओसिसचे वैशिष्ट्य. गुठळ्याही येतात?"
}
}
]
},
{
"code": "bowel_bladder",
"q": {
"en": "During your period — pain with bowel movements, diarrhoea, constipation, or burning when passing urine?",
"hi": "पीरियड में — मल त्याग में दर्द, दस्त, कब्ज़, या पेशाब में जलन?",
"mr": "पाळीदरम्यान — मलत्यागात दुखणे, जुलाब, बद्धकोष्ठता, किंवा लघवी करताना जळजळ?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha",
"pain",
"दर्द",
"burning",
"जलन"
],
"code": "bowel_detail",
"q": {
"en": "Bowel and bladder symptoms during period are very significant — endo tissue can grow on these organs too. Only during periods, or at other times?",
"hi": "पीरियड में आँत और मूत्राशय के लक्षण बहुत महत्वपूर्ण — एंडो ऊतक इन पर भी उग सकता है। सिर्फ पीरियड में, या और समय भी?",
"mr": "पाळीदरम्यान आतडे आणि मूत्राशयाची लक्षणे — एंडो ऊतक इथेही वाढू शकते. फक्त पाळीत, की इतर वेळीही?"
}
}
]
},
{
"code": "pain_worsening",
"q": {
"en": "Has the period pain been getting worse every year?",
"hi": "हर साल पीरियड दर्द बढ़ रहा है?",
"mr": "दरवर्षी पाळीची वेदना वाढत आहे?"
}
},
{
"code": "family_endo",
"q": {
"en": "Mother or sister with very painful periods or endometriosis?",
"hi": "माँ या बहन को बहुत दर्दनाक पीरियड्स या एंडोमेट्रियोसिस?",
"mr": "आई किंवा बहिणीला खूप वेदनादायक पाळी किंवा एंडोमेट्रिओसिस?"
}
}
],
"thyroid": [
{
"code": "how_long_thyroid",
"q": {
"en": "How long have you felt this way — weeks, months, or over a year?",
"hi": "यह कितने समय से — हफ्ते, महीने, एक साल से ज़्यादा?",
"mr": "हे किती दिवसांपासून — आठवडे, महिने, वर्षापेक्षा जास्त?"
}
},
{
"code": "fatigue_after_sleep",
"q": {
"en": "Tiredness even after a full night's sleep — on most days?",
"hi": "रात की पूरी नींद के बाद भी थकान — अधिकांश दिन?",
"mr": "रात्री पूर्ण झोपेनंतरही थकवा — बहुतेक दिवस?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha"
],
"code": "fatigue_severity",
"q": {
"en": "How severe — can you do daily activities, or is the fatigue stopping you?",
"hi": "कितना गंभीर — रोज़मर्रा के काम होते हैं, या थकान रोक रही है?",
"mr": "किती तीव्र — दैनंदिन कामे होतात, किंवा थकवा थांबवतोय?"
}
}
]
},
{
"code": "mental_fog",
"q": {
"en": "Mentally slow or foggy — trouble concentrating or forgetting more than before?",
"hi": "दिमागी धीमा या धुंधला — ध्यान में कठिनाई या ज़्यादा भूल?",
"mr": "मानसिकदृष्ट्या मंद — लक्ष केंद्रित करण्यात अडचण?"
}
},
{
"code": "temperature_sensitivity",
"q": {
"en": "Unusually cold when others are comfortable — always needing extra layers? Or opposite — unusually hot and sweaty?",
"hi": "दूसरों के आरामदायक होने पर भी ठंड — हमेशा ज़्यादा कपड़े? या उल्टा — बहुत गर्मी?",
"mr": "इतरांना आरामदायक वाटत असताना थंडी — नेहमी जास्त कपडे? किंवा उलटे — खूप उष्णता?"
},
"followups": [
{
"trigger": [
"cold",
"ठंड",
"ठंडी",
"thandi"
],
"code": "cold_hands_feet",
"q": {
"en": "Hands and feet specifically cold — even when the rest of you feels normal?",
"hi": "हाथ-पैर खासतौर पर ठंडे — बाकी शरीर ठीक लगे?",
"mr": "हात-पाय विशेषतः थंड — उर्वरित शरीर ठीक असतानाही?"
}
},
{
"trigger": [
"hot",
"गर्मी",
"sweaty",
"पसीना"
],
"code": "palpitations_thyroid",
"q": {
"en": "Heart racing too — especially at rest? Heat intolerance with palpitations suggests overactive thyroid.",
"hi": "दिल तेज़ भी — खासकर आराम में? गर्मी के साथ धड़कन — अति-सक्रिय थायराइड का संकेत।",
"mr": "हृदय वेगाने धडधडतेही — विश्रांतीत? उष्णतेसह — अतिसक्रिय थायरॉईडचे संकेत."
}
}
]
},
{
"code": "weight_change",
"q": {
"en": "Weight changed without trying — up or down without diet change?",
"hi": "बिना कोशिश वजन बदला — बढ़ा या घटा?",
"mr": "प्रयत्नाशिवाय वजन बदलले?"
},
"followups": [
{
"trigger": [
"gain",
"बढ़ा",
"वाढले",
"gained"
],
"code": "weight_gain_thyroid",
"q": {
"en": "Gaining weight despite eating the same is a classic hypothyroid symptom. Roughly how much, and over how long?",
"hi": "समान खाने पर वजन बढ़ना — हाइपोथायराइड का क्लासिक लक्षण। लगभग कितना, और कितने समय में?",
"mr": "समान जेवणावर वजन वाढणे — हायपोथायरॉईडचे क्लासिक लक्षण. किती, किती वेळात?"
}
},
{
"trigger": [
"loss",
"घटा",
"कमी",
"lost"
],
"code": "weight_loss_thyroid",
"q": {
"en": "Losing weight without trying suggests overactive thyroid. Have you also been eating more than usual?",
"hi": "बिना कोशिश वजन घटना — अति-सक्रिय थायराइड। पहले से ज़्यादा खाना खाती हैं?",
"mr": "प्रयत्नाशिवाय वजन कमी — अतिसक्रिय थायरॉईड. पूर्वीपेक्षा जास्त खाता?"
}
}
]
},
{
"code": "hair_falling",
"q": {
"en": "Hair falling more than before — in handfuls when combing?",
"hi": "बाल ज़्यादा झड़ रहे — कंघी पर?",
"mr": "केस जास्त गळतायत — कंगव्याने?"
}
},
{
"code": "dry_skin",
"q": {
"en": "Skin becoming dry or rough — even without weather change?",
"hi": "त्वचा सूखी या खुरदरी — मौसम न बदला तब भी?",
"mr": "त्वचा कोरडी — वातावरण न बदलताही?"
}
},
{
"code": "constipation",
"q": {
"en": "Constipation — less frequent or harder stools than before?",
"hi": "कब्ज़ — पहले से कम या कठोर मल?",
"mr": "बद्धकोष्ठता — पूर्वीपेक्षा कमी किंवा कठीण मल?"
}
},
{
"code": "neck_swelling",
"q": {
"en": "Any swelling or fullness at the front of your neck — or tightness when you swallow?",
"hi": "गर्दन के सामने सूजन या भरापन — निगलते वक्त कसाव?",
"mr": "मानेच्या समोर सूज — गिळताना घट्टपणा?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha",
"swelling",
"सूजन",
"सूज"
],
"code": "neck_swelling_detail",
"q": {
"en": "Does it move up and down when you swallow? A lump moving with swallowing is almost always thyroid. Painful or painless?",
"hi": "निगलते वक्त ऊपर-नीचे हिलता है? निगलने पर हिलने वाली गांठ लगभग हमेशा थायराइड। दर्दनाक या नहीं?",
"mr": "गिळताना वर-खाली हलते? गिळताना हलणारी गाठ जवळजवळ नेहमी थायरॉईड. दुखते का?"
}
}
]
},
{
"code": "period_change_thyroid",
"q": {
"en": "Have your periods changed — heavier, more irregular, or stopping?",
"hi": "पीरियड्स बदले — भारी, अनियमित, या बंद?",
"mr": "पाळी बदलली — जड, अनियमित, बंद?"
}
},
{
"code": "family_thyroid",
"q": {
"en": "Mother or sister with a thyroid problem?",
"hi": "माँ या बहन को थायराइड?",
"mr": "आई किंवा बहीण — थायरॉईडची समस्या?"
}
}
],
"metabolic": [
{
"code": "how_long_meta",
"q": {
"en": "How long have you had these symptoms?",
"hi": "ये लक्षण कितने समय से?",
"mr": "ही लक्षणे किती दिवसांपासून?"
}
},
{
"code": "thirst_urination",
"q": {
"en": "Very thirsty often — even after drinking water? And urinating frequently?",
"hi": "अक्सर बहुत प्यास — पानी पीने के बाद भी? बार-बार पेशाब?",
"mr": "वारंवार तहान — पाणी पिल्यानंतरही? वारंवार लघवी?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha",
"night",
"रात",
"रात्री"
],
"code": "nocturia",
"q": {
"en": "Waking more than once at night to urinate — nocturia — is a very specific diabetes sign. Does this happen to you?",
"hi": "रात में एक से ज़्यादा बार पेशाब के लिए उठना — नोक्टुरिया — मधुमेह का विशिष्ट संकेत। क्या होता है?",
"mr": "रात्री एकापेक्षा जास्त वेळा लघवीसाठी उठणे — नोक्टुरिया — मधुमेहाचे विशिष्ट लक्षण. होते का?"
}
}
]
},
{
"code": "wound_healing",
"q": {
"en": "Cuts or wounds taking more than a week to heal?",
"hi": "कट या घाव एक हफ्ते से ज़्यादा ठीक होने में?",
"mr": "जखमा बरे होण्यास एका आठवड्यापेक्षा जास्त वेळ?"
}
},
{
"code": "tingling",
"q": {
"en": "Tingling, numbness, or burning in hands or feet?",
"hi": "हाथ-पैरों में झनझनाहट, सुन्नता, या जलन?",
"mr": "हात-पायांमध्ये मुंग्या, सुन्नपणा, जळजळ?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"ha"
],
"code": "tingling_severity",
"q": {
"en": "Tingling in feet is a sign of diabetic nerve damage. Is it mostly feet, hands, or both? Worse at night?",
"hi": "पैरों में झनझनाहट — डायबिटिक तंत्रिका क्षति का संकेत। ज़्यादातर पैर, हाथ, या दोनों? रात को ज़्यादा?",
"mr": "पायांमध्ये मुंग्या — मधुमेह मज्जातंतू नुकसानाचे संकेत. जास्त पाय, हात, किंवा दोन्ही? रात्री जास्त?"
}
}
]
},
{
"code": "blurred_vision",
"q": {
"en": "Blurred vision that comes and goes?",
"hi": "धुंधला दिखना जो आता-जाता है?",
"mr": "अंधुक दिसणे जे येते आणि जाते?"
}
},
{
"code": "family_diabetes",
"q": {
"en": "Parents or siblings with diabetes?",
"hi": "माँ-बाप या भाई-बहन को मधुमेह?",
"mr": "आई-बाबा किंवा भाऊ-बहीण — मधुमेह?"
}
}
],
"breast": [
{
"code": "main_symptom",
"q": {
"en": "Tell me your main breast concern — lump, pain, nipple discharge, skin change, or shape change?",
"hi": "मुख्य स्तन चिंता — गांठ, दर्द, निपल रिसाव, त्वचा बदलाव, या आकार बदलाव?",
"mr": "मुख्य स्तन काळजी — गाठ, दुखणे, निपल स्राव, त्वचेत बदल?"
},
"followups": [
{
"trigger": [
"lump",
"गांठ",
"गाठ",
"mass"
],
"code": "lump_detail",
"q": {
"en": "For the lump — painful or painless? Most cancer lumps are painless. Hard or soft? Does it move when pressed?",
"hi": "गांठ — दर्दनाक या नहीं? अधिकांश कैंसरस गांठें दर्दरहित। कठोर या मुलायम? दबाने पर हिलती है?",
"mr": "गाठ — दुखते का? बहुतेक कर्करोगाच्या गाठी वेदनारहित. कठीण की मऊ? दाबल्यावर हलते?"
}
},
{
"trigger": [
"discharge",
"निपल",
"nipple",
"रिसाव",
"स्राव"
],
"code": "discharge_detail",
"q": {
"en": "Discharge colour? Blood-stained or brown is concerning. Milky from both sides is usually hormonal. One side or both?",
"hi": "रिसाव का रंग? खून जैसा या भूरा चिंताजनक। दोनों से दूधिया आमतौर पर हार्मोनल। एक या दोनों?",
"mr": "स्राव रंग? रक्तमिश्रित किंवा तपकिरी — चिंताजनक. एका किंवा दोन्हीकडून?"
}
}
]
},
{
"code": "symptom_duration",
"q": {
"en": "How long have you noticed this?",
"hi": "यह कितने समय से?",
"mr": "हे किती दिवसांपासून?"
}
},
{
"code": "skin_changes",
"q": {
"en": "Any skin changes — dimpling, puckering, redness, or orange-peel texture?",
"hi": "त्वचा में बदलाव — धंसना, सिकुड़न, लालिमा, या संतरे जैसी?",
"mr": "त्वचेत बदल — खड्डे, सुरकुत्या, लालसरपणा, संत्र्याच्या सालीसारखी?"
}
},
{
"code": "family_breast",
"q": {
"en": "Close family — mother, sister, grandmother — with breast cancer? At what age?",
"hi": "परिवार में — माँ, बहन, दादी — को स्तन कैंसर? किस उम्र में?",
"mr": "कुटुंबात — आई, बहीण, आजी — स्तनाचा कर्करोग? कोणत्या वयात?"
}
},
{
"code": "menstrual_history",
"q": {
"en": "Age when periods started? Have you reached menopause?",
"hi": "पीरियड्स किस उम्र में? रजोनिवृत्ति?",
"mr": "पाळी कोणत्या वयात सुरू? रजोनिवृत्ती?"
}
},
{
"code": "hormone_use",
"q": {
"en": "Long-term hormone treatments — combined pill or HRT?",
"hi": "लंबे समय तक हार्मोन — कंबाइंड पिल या HRT?",
"mr": "दीर्घकाळ हार्मोन — कंबाइंड पिल किंवा HRT?"
}
}
],
"amenorrhea": [
{
"code": "amen_ever_period",
"q": {
"en": "Have you ever had a monthly period — even once?",
"hi": "क्या कभी मासिक धर्म हुआ है — एक बार भी?",
"mr": "कधीतरी मासिक पाळी आली आहे का — एकदा तरी?"
},
"followups": [
{
"trigger": [
"no",
"never",
"कभी नहीं",
"नहीं",
"nahi",
"कधीच नाही"
],
"code": "amen_primary_age",
"q": {
"en": "How old are you? And has breast development or pubic hair started?",
"hi": "कितने साल की हैं? स्तन विकास या जघन बाल शुरू हुए?",
"mr": "किती वय आहे? स्तन विकास किंवा जघन केस सुरू झाले?"
}
}
]
},
{
"code": "amen_last_period",
"q": {
"en": "When was your very last period — approximately how many months ago?",
"hi": "आखिरी पीरियड कब था — लगभग कितने महीने पहले?",
"mr": "शेवटची पाळी कधी होती — साधारण किती महिन्यांपूर्वी?"
}
},
{
"code": "amen_pregnancy",
"q": {
"en": "Could you be pregnant — any possibility? Pregnancy is the most common reason periods stop and changes everything I recommend.",
"hi": "क्या गर्भवती हो सकती हैं — कोई संभावना? गर्भावस्था सबसे सामान्य कारण है।",
"mr": "गरोदर असू शकता का — कोणतीही शक्यता? गर्भधारणा सर्वात सामान्य कारण आहे."
},
"followups": [
{
"trigger": [
"yes",
"maybe",
"हाँ",
"हो",
"possibly",
"शायद",
"हा",
"ho sakta",
"ho sakti"
],
"code": "amen_pregnancy_test",
"q": {
"en": "We should do a quick pregnancy test first — it only takes 2 minutes and changes everything. Shall we do that now?",
"hi": "पहले त्वरित गर्भावस्था परीक्षण करें — 2 मिनट लगते हैं। अभी करें?",
"mr": "आधी त्वरित गर्भधारणा चाचणी करू — 2 मिनिटे. आत्ता करू का?"
}
}
]
},
{
"code": "amen_stress_weight",
"q": {
"en": "A lot of stress recently, or significant weight loss, or very intense exercise?",
"hi": "हाल में बहुत तनाव, या काफी वजन घटना, या बहुत तीव्र व्यायाम?",
"mr": "अलीकडे खूप तणाव, वजन कमी, किंवा तीव्र व्यायाम?"
},
"followups": [
{
"trigger": [
"yes",
"haan",
"ha",
"हाँ",
"weight",
"vajan",
"stress",
"exercise"
],
"code": "amen_eating",
"q": {
"en": "Any changes in how much you eat — very little, skipping meals, or worried about weight? No judgment here.",
"hi": "खाने में बदलाव — बहुत कम, खाना छोड़ना, या वजन चिंता? कोई आलोचना नहीं।",
"mr": "जेवणात बदल — खूप कमी, जेवण सोडणे, वजनाची काळजी? कोणताही निर्णय नाही."
}
}
]
},
{
"code": "amen_galactorrhoea",
"q": {
"en": "Any milky discharge from breasts without breastfeeding? And frequent headaches or vision changes?",
"hi": "बिना स्तनपान दूधिया रिसाव? बार-बार सिरदर्द या दृष्टि बदलाव?",
"mr": "स्तनपान न करताना दुधासारखा स्राव? वारंवार डोकेदुखी किंवा दृष्टी बदल?"
},
"followups": [
{
"trigger": [
"yes",
"milky",
"discharge",
"हाँ",
"दूध",
"रिसाव",
"स्राव",
"white"
],
"code": "amen_prolactin_detail",
"q": {
"en": "From one breast or both? And are headaches or vision changes new? Milky discharge without breastfeeding points to elevated prolactin — a pituitary signal.",
"hi": "एक या दोनों से? सिरदर्द या दृष्टि बदलाव नए? यह प्रोलैक्टिन बढ़ने का संकेत है।",
"mr": "एका किंवा दोन्हीकडून? डोकेदुखी नवीन? हे प्रोलॅक्टिन वाढण्याचे संकेत आहे."
}
}
]
},
{
"code": "amen_androgens",
"q": {
"en": "Extra hair on face or body, acne, or weight gain around the middle?",
"hi": "चेहरे या शरीर पर ज़्यादा बाल, मुंहासे, या पेट के आसपास वजन बढ़ना?",
"mr": "चेहऱ्यावर जास्त केस, मुरुमे, किंवा पोटाभोवती वजन वाढणे?"
},
"followups": [
{
"trigger": [
"yes",
"haan",
"ha",
"हाँ",
"chin",
"facial",
"acne",
"मुंहासे",
"बाल",
"weight"
],
"code": "amen_androgens_detail",
"q": {
"en": "Since when? Missed periods + extra facial hair + acne = PCOS-related amenorrhoea. Has it been getting worse?",
"hi": "कब से? बंद पीरियड + चेहरे बाल + मुंहासे = PCOS अमेनोरिया। बढ़ रहा है?",
"mr": "कधीपासून? बंद पाळी + चेहऱ्यावर केस + मुरुमे = PCOS अमेनोरिया. वाढत आहे?"
}
}
]
},
{
"code": "amen_thyroid_ovarian",
"q": {
"en": "Feeling unusually cold or tired — or have hot flashes or night sweats? Cold+tired = thyroid; hot flashes in a young woman = possible early ovarian changes.",
"hi": "असामान्य ठंड या थकान — या गर्मी की लहरें या रात को पसीना?",
"mr": "असामान्य थंडी किंवा थकवा — उष्णतेच्या लाटा किंवा रात्री घाम?"
}
},
{
"code": "amen_cyclical_pain",
"q": {
"en": "Do you get monthly lower-belly cramping like a period is trying to come — but no bleeding appears?",
"hi": "मासिक निचले पेट में ऐंठन जैसे पीरियड आना चाहता हो — लेकिन खून नहीं?",
"mr": "मासिक खालच्या पोटात पेटके पाळी येण्यासारखे — पण रक्तस्राव नाही?"
},
"followups": [
{
"trigger": [
"yes",
"haan",
"ha",
"हाँ",
"pain",
"dard",
"cramp",
"पेट दर्द",
"पेटके"
],
"code": "amen_outflow",
"q": {
"en": "Cramping WITHOUT bleeding is urgent — blood may have nowhere to flow. This needs a gynaecologist urgently. Is the pain getting worse each month?",
"hi": "रक्त बिना ऐंठन — तत्काल स्त्री रोग विशेषज्ञ। दर्द हर महीने बढ़ रहा है?",
"mr": "रक्ताशिवाय पेटके — तातडीने स्त्रीरोगतज्ञ. दर महिन्याला वेदना वाढत आहे?"
}
}
]
},
{
"code": "amen_family_history",
"q": {
"en": "Family history of late or absent periods, early menopause, or any genetic condition?",
"hi": "परिवार में देर से या बिना पीरियड, जल्दी रजोनिवृत्ति, या आनुवंशिक स्थिति?",
"mr": "कुटुंबात उशिरा किंवा नसलेली पाळी, लवकर रजोनिवृत्ती, किंवा अनुवांशिक स्थिती?"
}
}
],
"metabolic_enhanced": [
{
"code": "meta_thirst_urination",
"q": {
"en": "Very thirsty often even after drinking water? And passing urine more — especially waking up at night?",
"hi": "अक्सर बहुत प्यास पानी पीने के बाद भी? रात में पेशाब के लिए उठना?",
"mr": "वारंवार तहान पाणी पिल्यानंतरही? रात्री लघवीसाठी उठणे?"
},
"followups": [
{
"trigger": [
"yes",
"haan",
"ha",
"हाँ",
"always",
"night",
"रात"
],
"code": "meta_thirst_detail",
"q": {
"en": "Since when, and is it getting worse? Thirst + frequent urination — especially at night — is a classic high blood sugar signal.",
"hi": "कब से, और बढ़ रहा है? प्यास + बार-बार पेशाब — खासकर रात में — ब्लड शुगर बढ़ने का संकेत।",
"mr": "कधीपासून, वाढत आहे? तहान + वारंवार लघवी — विशेषतः रात्री — उच्च रक्त शर्करेचे संकेत."
}
}
]
},
{
"code": "meta_fatigue_weight",
"q": {
"en": "Very tired recently — or noticed unexplained weight change, either losing without trying or gaining around the belly?",
"hi": "हाल में बहुत थकान — या बिना कोशिश वजन बदला, घट रहा या पेट पर बढ़ रहा?",
"mr": "अलीकडे खूप थकवा — किंवा विनाकारण वजन बदल, कमी होतेय की पोटावर वाढतेय?"
}
},
{
"code": "meta_neuropathy",
"q": {
"en": "Tingling, numbness, or burning in hands or feet? Or cuts that are very slow to heal?",
"hi": "हाथ-पैरों में झनझनाहट, सुन्नता, जलन? या बहुत धीरे ठीक होने वाले कट?",
"mr": "हात-पायांमध्ये मुंग्या, सुन्नपणा, जळजळ? किंवा खूप हळू बरे होणारे कट?"
},
"followups": [
{
"trigger": [
"yes",
"haan",
"ha",
"हाँ",
"tingling",
"numbness",
"slow",
"heal"
],
"code": "meta_neuropathy_feet",
"q": {
"en": "Tingling in feet that is worse at night is called diabetic neuropathy — it means blood sugar has been elevated for some time. Is it mostly in the feet?",
"hi": "रात में पैरों में झनझनाहट — डायबिटिक न्यूरोपैथी। ज़्यादातर पैरों में?",
"mr": "रात्री पायांमध्ये मुंग्या — डायबेटिक न्यूरोपॅथी. जास्त पायांमध्ये?"
}
}
]
},
{
"code": "meta_central_obesity",
"q": {
"en": "Do you carry weight around your belly or waist? In Indians, central belly fat raises risk even at normal body weight — this is the thin-fat pattern.",
"hi": "पेट या कमर के आसपास वजन? भारतीयों में सामान्य वजन पर भी पेट की चर्बी — यह thin-fat पैटर्न है।",
"mr": "पोट किंवा कमरेभोवती वजन? भारतीयांमध्ये सामान्य वजनावरही — हा thin-fat नमुना आहे."
}
},
{
"code": "meta_diet_habits",
"q": {
"en": "Tell me about your usual food — mostly rice, roti, sweets, and fried food? Or balanced with vegetables and protein?",
"hi": "सामान्य खाना — ज़्यादातर चावल, रोटी, मिठाई, तला हुआ? या सब्ज़ी और प्रोटीन के साथ संतुलित?",
"mr": "सामान्य जेवण — जास्तकरून भात, चपाती, मिठाई, तळलेले? की भाजी आणि प्रथिनांसह संतुलित?"
},
"followups": [
{
"trigger": [
"rice",
"roti",
"sweet",
"fried",
"cold drink",
"biscuit",
"चावल",
"मिठाई",
"तला"
],
"code": "meta_hidden_sugar",
"q": {
"en": "How often do you have sugary tea, cold drinks, or packaged biscuits? These are hidden sugar sources that drive insulin resistance.",
"hi": "कितनी बार मीठी चाय, कोल्ड ड्रिंक, या पैकेज्ड बिस्किट? ये छुपे शुगर स्रोत हैं।",
"mr": "किती वेळा गोड चहा, कोल्ड ड्रिंक, पॅकेजड बिस्किट? हे लपलेले साखरेचे स्रोत आहेत."
}
}
]
},
{
"code": "meta_activity_level",
"q": {
"en": "How active are you — walking or exercise most days, or mostly sitting?",
"hi": "कितना सक्रिय हैं — ज़्यादातर दिन चलना या व्यायाम, या ज़्यादातर बैठना?",
"mr": "किती सक्रिय — बहुतेक दिवस चालणे किंवा व्यायाम, किंवा जास्तकरून बसणे?"
}
},
{
"code": "meta_cardiac_sx",
"q": {
"en": "Any chest pain, chest tightness, or breathlessness — especially when physically active?",
"hi": "सीने में दर्द, कसाव, या सांस फूलना — खासकर शारीरिक गतिविधि में?",
"mr": "छातीत दुखणे, घट्टपणा, किंवा दम लागणे — शारीरिक हालचालीत?"
},
"followups": [
{
"trigger": [
"yes",
"haan",
"ha",
"हाँ",
"chest",
"pain",
"breathless"
],
"code": "meta_cardiac_urgent",
"q": {
"en": "Chest symptoms with metabolic risk are serious and may involve the heart. Is this new, and does it come with exertion and ease with rest?",
"hi": "चयापचय जोखिम के साथ सीने के लक्षण गंभीर हैं। नया है, और गतिविधि से आता आराम से जाता?",
"mr": "चयापचय जोखमासह छातीची लक्षणे गंभीर. नवीन आहे, हालचालीने येते विश्रांतीने जाते?"
}
}
]
},
{
"code": "meta_pcos_gestational",
"q": {
"en": "Have you been told you have PCOS, or did you have diabetes during a pregnancy?",
"hi": "PCOS बताया गया है, या गर्भावस्था में मधुमेह था?",
"mr": "PCOS सांगितले आहे, किंवा गर्भधारणेत मधुमेह झाला होता?"
}
},
{
"code": "meta_family_hx",
"q": {
"en": "Does diabetes or heart disease run in your family — parents or siblings?",
"hi": "परिवार में मधुमेह या दिल की बीमारी — माँ-बाप या भाई-बहन?",
"mr": "कुटुंबात मधुमेह किंवा हृदयरोग — आई-बाबा किंवा भाऊ-बहीण?"
}
},
{
"code": "meta_current_meds",
"q": {
"en": "Are you taking any medicine for blood sugar, blood pressure, or cholesterol?",
"hi": "ब्लड शुगर, बीपी, या कोलेस्ट्रॉल के लिए कोई दवाई ले रही हैं?",
"mr": "रक्त शर्करा, रक्तदाब, किंवा कोलेस्ट्रॉलसाठी औषधे घेत आहात?"
},
"followups": [
{
"trigger": [
"yes",
"metformin",
"insulin",
"medicine",
"दवाई",
"haan"
],
"code": "meta_med_control",
"q": {
"en": "Which medicines, and are your levels well-controlled on them? If sugar or BP is still high despite medication, that needs to be addressed.",
"hi": "कौन सी दवाइयाँ, और क्या उनसे नियंत्रित हैं? दवाई के बावजूद शुगर या बीपी ज़्यादा — ध्यान देना होगा।",
"mr": "कोणती औषधे, आणि त्यावर नियंत्रित आहे का? औषध असूनही जास्त असल्यास — लक्ष द्यावे."
}
}
]
}
],
"general": [
{
"code": "how_long_general",
"q": {
"en": "How long has this been going on — days, weeks, or months?",
"hi": "यह कितने समय से — दिन, हफ्ते, या महीने?",
"mr": "हे किती दिवसांपासून?"
}
},
{
"code": "other_symptoms",
"q": {
"en": "Anything else bothering you — appetite, sleep, mood, or any other worry?",
"hi": "कुछ और — भूख, नींद, मूड, या कोई और चिंता?",
"mr": "आणखी काही — भूक, झोप, मूड, किंवा इतर काळजी?"
}
}
]
};

export const CONDITION_QUESTIONS: Record<string, Question[]> = {
"pcos": [
{
"code": "period_regularity",
"q": {
"en": "Let me start with your periods — do they come on time each month, or are they irregular, late, or skipping months?",
"hi": "पीरियड्स से शुरू करते हैं — हर महीने समय पर आते हैं, या अनियमित, देर से, या कभी-कभी नहीं आते?",
"mr": "पाळीपासून सुरू करूया — दर महिन्याला वेळेवर येते का, की अनियमित, उशिरा, किंवा येतच नाही?"
}
},
{
"code": "period_duration_months",
"q": {
"en": "How long have your periods been like this — is this something recent or has it been going on for months or years?",
"hi": "पीरियड्स कितने समय से ऐसे हैं — हाल में हुआ या महीनों-सालों से?",
"mr": "पाळी किती दिवसांपासून अशी आहे — अलीकडे झाले का महिने-वर्षे आहे?"
}
},
{
"code": "period_flow",
"q": {
"en": "When your period does come, is the flow heavy, very light, or does it change each time?",
"hi": "जब पीरियड आता है, तो प्रवाह भारी है, बहुत हल्का, या हर बार बदलता है?",
"mr": "पाळी येते तेव्हा प्रवाह जड, खूप हलका, किंवा दरवेळी बदलतो का?"
}
},
{
"code": "period_color",
"q": {
"en": "What colour is your period blood — bright red, dark brown, almost black, or mixed with clots?",
"hi": "पीरियड का रक्त किस रंग का है — चमकदार लाल, गहरा भूरा, लगभग काला, या गाँठों के साथ?",
"mr": "पाळीचे रक्त कोणत्या रंगाचे — चमकदार लाल, गडद तपकिरी, जवळजवळ काळे, किंवा गुठळ्यांसह?"
}
},
{
"code": "period_clots",
"q": {
"en": "Do you pass blood clots during your period? If yes — are they small, coin-sized, or larger?",
"hi": "पीरियड के दौरान रक्त गाँठें निकलती हैं? हाँ तो — छोटी, सिक्के जितनी, या बड़ी?",
"mr": "पाळीदरम्यान रक्ताच्या गुठळ्या येतात? हो असल्यास — लहान, नाण्याएवढ्या, किंवा मोठ्या?"
}
},
{
"code": "facial_hair",
"q": {
"en": "Have you noticed extra hair on your face — chin, upper lip, or cheeks — more than before?",
"hi": "चेहरे पर ज़्यादा बाल — ठुड्डी, ऊपरी होंठ, गाल?",
"mr": "चेहऱ्यावर जास्त केस — हनुवटी, वरील ओठ, गाल?"
}
},
{
"code": "body_hair",
"q": {
"en": "What about extra hair on your chest, stomach, or inner thighs — more than before?",
"hi": "सीने, पेट, या जांघों के अंदर पहले से ज़्यादा बाल?",
"mr": "छाती, पोट, किंवा मांड्यांवर पूर्वीपेक्षा जास्त केस?"
}
},
{
"code": "weight_gain",
"q": {
"en": "Have you gained weight recently without trying — without changing what you eat?",
"hi": "बिना कोशिश किए वजन बढ़ा — खान-पान बदले बिना?",
"mr": "प्रयत्नाशिवाय वजन वाढले — जेवणात बदल न करता?"
}
},
{
"code": "acne",
"q": {
"en": "Do you get acne that keeps coming back — on your face, back, or chest?",
"hi": "बार-बार मुंहासे — चेहरे, पीठ, सीने पर?",
"mr": "वारंवार मुरुमे — चेहऱ्यावर, पाठीवर, छातीवर?"
}
},
{
"code": "dark_patches",
"q": {
"en": "Have you noticed dark patches on your neck, underarms, or inner thighs?",
"hi": "गर्दन, बगल, जांघों के अंदर काले धब्बे?",
"mr": "मान, काख, मांड्यांवर काळे डाग?"
}
},
{
"code": "scalp_hair",
"q": {
"en": "Is the hair on your scalp thinning — especially at the top or centre part?",
"hi": "सिर के बाल पतले हो रहे हैं — खासकर ऊपर या बीच में?",
"mr": "डोक्यावरचे केस विरळ होतायत — विशेषतः मध्यभागी?"
}
},
{
"code": "family_pcos",
"q": {
"en": "Does your mother or sister have irregular periods, diabetes, or a hormonal problem?",
"hi": "माँ या बहन को अनियमित पीरियड्स, मधुमेह, या हार्मोनल समस्या?",
"mr": "आई किंवा बहिणीला अनियमित पाळी, मधुमेह, हार्मोनल समस्या?"
}
}
],
"anaemia": [
{
"code": "how_long_anaemia",
"q": {
"en": "How long have you been feeling this way — weeks, months, or longer?",
"hi": "यह तकलीफ कितने समय से — हफ्ते, महीने, या ज़्यादा?",
"mr": "हा त्रास किती दिवसांपासून — आठवडे, महिने, किंवा जास्त?"
}
},
{
"code": "pallor_told",
"q": {
"en": "Has anyone told you recently that you look pale or your face looks dull?",
"hi": "किसी ने हाल में कहा कि आप पीली लग रही हैं?",
"mr": "कोणी सांगितले का की तुम्ही फिकट दिसता?"
}
},
{
"code": "pallor_eyelids",
"q": {
"en": "Pull your lower eyelid down gently — does the inside look pale white instead of pink?",
"hi": "निचली पलक खींचें — अंदर सफेद दिखता है, गुलाबी नहीं?",
"mr": "खालची पापणी ओढा — आतील भाग पांढरा दिसतो का?"
}
},
{
"code": "dizziness",
"q": {
"en": "Do you feel dizzy when you stand up quickly?",
"hi": "जल्दी उठने पर चक्कर?",
"mr": "झटपट उठल्यावर चक्कर येते का?"
}
},
{
"code": "breathlessness",
"q": {
"en": "Do you get breathless climbing stairs or walking fast — more than others your age?",
"hi": "सीढ़ी चढ़ने या तेज़ चलने पर सांस फूलती है?",
"mr": "जिना चढताना किंवा वेगाने चालताना दम लागतो का?"
}
},
{
"code": "palpitations",
"q": {
"en": "Does your heart ever race or flutter — even when you are resting?",
"hi": "दिल तेज़ या फड़फड़ाता है — आराम में भी?",
"mr": "हृदय वेगाने धडधडते — विश्रांतीतही?"
}
},
{
"code": "pica",
"q": {
"en": "Do you crave unusual things — like ice, chalk, clay, or raw rice?",
"hi": "बर्फ, चॉक, मिट्टी, या कच्चे चावल खाने की इच्छा?",
"mr": "बर्फ, खडू, माती, कच्चा तांदूळ खाण्याची इच्छा?"
}
},
{
"code": "heavy_periods_anaemia",
"q": {
"en": "Are your periods very heavy — changing pads more than once every 2 hours, or lasting more than 7 days?",
"hi": "पीरियड बहुत भारी — हर 2 घंटे में पैड बदलना, या 7 दिन से ज़्यादा?",
"mr": "पाळी खूप जड — दर 2 तासांनी पॅड बदलणे किंवा 7 दिवसांपेक्षा जास्त?"
}
},
{
"code": "brittle_nails",
"q": {
"en": "Are your nails becoming brittle or breaking easily?",
"hi": "नाखून नाज़ुक हो रहे हैं या आसानी से टूटते हैं?",
"mr": "नखे नाजूक होतायत किंवा सहज तुटतात?"
}
},
{
"code": "gi_symptoms",
"q": {
"en": "Have you noticed very dark or black stools, or any blood in your stools?",
"hi": "बहुत काला मल, या मल में खून?",
"mr": "खूप काळा मल किंवा मलात रक्त?"
}
},
{
"code": "iron_diet",
"q": {
"en": "How often do you eat iron-rich foods — lentils, spinach, drumstick leaves, eggs, liver? Daily, a few times a week, or rarely?",
"hi": "कितनी बार आयरन युक्त खाना — दाल, पालक, मुनगा, अंडे? रोज़, कुछ बार, या कभी-कभार?",
"mr": "किती वेळा लोह-समृद्ध अन्न — डाळ, पालक, शेवगा, अंडी? रोज, काही वेळा, क्वचित?"
}
},
{
"code": "tea_coffee",
"q": {
"en": "Do you drink tea or coffee immediately after eating?",
"hi": "खाने के तुरंत बाद चाय या कॉफी?",
"mr": "जेवणानंतर लगेच चहा किंवा कॉफी?"
}
}
],
"hypertension": [
{
"code": "how_long_bp",
"q": {
"en": "How long have you been having these headaches — weeks, months, or longer?",
"hi": "सिरदर्द कितने समय से — हफ्ते, महीने, या ज़्यादा?",
"mr": "डोकेदुखी किती दिवसांपासून — आठवडे, महिने, जास्त?"
}
},
{
"code": "headache_location",
"q": {
"en": "Where exactly do you feel them — front, back, temples, or all over?",
"hi": "ठीक कहाँ — आगे, पीछे, कनपटी, या पूरे सिर में?",
"mr": "नक्की कुठे — समोर, मागे, कपाळ, संपूर्ण डोक्यात?"
}
},
{
"code": "headache_timing",
"q": {
"en": "When are they worst — morning when you wake up, after stress, or at a particular time?",
"hi": "कब सबसे ज़्यादा — सुबह उठने पर, तनाव के बाद, या किसी खास समय?",
"mr": "कधी सर्वात जास्त — सकाळी उठल्यावर, तणावानंतर, किंवा विशिष्ट वेळी?"
}
},
{
"code": "bp_known_high",
"q": {
"en": "Have you ever been told by a doctor that your blood pressure is high?",
"hi": "डॉक्टर ने कभी बताया बीपी ज़्यादा है?",
"mr": "डॉक्टरने कधी सांगितले रक्तदाब जास्त आहे?"
}
},
{
"code": "bp_medication",
"q": {
"en": "Are you currently taking any medicine for blood pressure?",
"hi": "अभी बीपी की दवाई लेती हैं?",
"mr": "सध्या रक्तदाबाची औषधे घेता का?"
}
},
{
"code": "vision_blur",
"q": {
"en": "Do you get blurred or double vision — especially with the headaches?",
"hi": "सिरदर्द के साथ धुंधला या दोहरा दिखता है?",
"mr": "डोकेदुखीसोबत अंधुक किंवा दुहेरी दृष्टी?"
}
},
{
"code": "chest_pain_bp",
"q": {
"en": "Do you feel any chest tightness or pressure?",
"hi": "सीने में कसाव या दबाव?",
"mr": "छातीत घट्टपणा किंवा दाब?"
}
},
{
"code": "heart_racing",
"q": {
"en": "Does your heart race or pound — even when not physically active?",
"hi": "दिल तेज़ धड़कता है — शारीरिक गतिविधि के बिना भी?",
"mr": "हृदय वेगाने धडधडते — शारीरिक हालचाल नसतानाही?"
}
},
{
"code": "salt_diet",
"q": {
"en": "Do you eat a lot of salty food — pickles, papads, or extra salt at the table?",
"hi": "ज़्यादा नमकीन खाना — अचार, पापड़, या थाली में ऊपर से नमक?",
"mr": "जास्त खारट जेवण — लोणचे, पापड, जेवणात वरून मीठ?"
}
},
{
"code": "family_bp",
"q": {
"en": "Does anyone in your family — parents or siblings — have high BP or heart disease?",
"hi": "परिवार में — माँ-बाप या भाई-बहन — हाई बीपी या दिल की बीमारी?",
"mr": "कुटुंबात — आई-बाबा किंवा भाऊ-बहीण — उच्च रक्तदाब किंवा हृदयरोग?"
}
}
],
"endometriosis": [
{
"code": "how_long_endo",
"q": {
"en": "How long have you been having this period pain — has it always been this bad or has it gotten worse over time?",
"hi": "पीरियड दर्द कितने समय से — हमेशा से इतना बुरा था या समय के साथ बढ़ा?",
"mr": "पाळीचे दुखणे किती दिवसांपासून — नेहमीच इतके होते का वेळानुसार वाढले?"
}
},
{
"code": "period_pain_severity",
"q": {
"en": "On a bad day, how severe is the pain — do you take painkillers, miss work, or are confined to bed?",
"hi": "बुरे दिन में दर्द की तीव्रता — दर्द-निवारक लेती हैं, काम छोड़ती हैं, या बिस्तर में?",
"mr": "वाईट दिवशी वेदनेची तीव्रता — वेदनाशामक घेता, काम सोडता, किंवा बेडवर?"
}
},
{
"code": "pelvic_pain_outside",
"q": {
"en": "Do you have pain in your lower belly or pelvic area even when NOT on your period?",
"hi": "पीरियड के बाहर भी पेट के नीचे या श्रोणि में दर्द?",
"mr": "पाळी नसतानाही पोटाच्या खाली किंवा ओटीपोटात दुखणे?"
}
},
{
"code": "period_heavy_endo",
"q": {
"en": "Are your periods very heavy — lasting more than 7 days?",
"hi": "पीरियड बहुत भारी — 7 दिन से ज़्यादा?",
"mr": "पाळी खूप जड — 7 दिवसांपेक्षा जास्त?"
}
},
{
"code": "blood_clots_endo",
"q": {
"en": "Do you pass large blood clots — bigger than a coin?",
"hi": "बड़ी रक्त गाँठें — सिक्के से बड़ी?",
"mr": "मोठ्या रक्ताच्या गुठळ्या — नाण्यापेक्षा मोठ्या?"
}
},
{
"code": "period_color_endo",
"q": {
"en": "What colour is your period blood — bright red, dark brown, or almost black? Dark or brownish blood can indicate older blood from endometrial tissue.",
"hi": "पीरियड का रक्त किस रंग का — चमकदार लाल, गहरा भूरा, या लगभग काला? गहरा या भूरा पुराने एंडोमेट्रियल ऊतक का संकेत हो सकता है।",
"mr": "पाळीचे रक्त कोणत्या रंगाचे — चमकदार लाल, गडद तपकिरी, जवळजवळ काळे?"
}
},
{
"code": "pain_worsening",
"q": {
"en": "Has the pain been getting worse every year — worse than it was 2-3 years ago?",
"hi": "हर साल दर्द बढ़ रहा है — 2-3 साल पहले से ज़्यादा?",
"mr": "दरवर्षी वेदना वाढत आहे का — 2-3 वर्षांपूर्वीपेक्षा जास्त?"
}
},
{
"code": "bowel_symptoms",
"q": {
"en": "During your period, do you have pain with bowel movements, diarrhoea, or constipation?",
"hi": "पीरियड के दौरान मल त्याग में दर्द, दस्त, या कब्ज़?",
"mr": "पाळीदरम्यान मलप्रवृत्तीत दुखणे, जुलाब, बद्धकोष्ठता?"
}
},
{
"code": "bladder_symptoms",
"q": {
"en": "During your period, any pain or burning when passing urine?",
"hi": "पीरियड के दौरान पेशाब करते वक्त दर्द या जलन?",
"mr": "पाळीदरम्यान लघवी करताना दुखणे किंवा जळजळ?"
}
},
{
"code": "family_endo",
"q": {
"en": "Does your mother or sister have very painful periods or been told they have endometriosis?",
"hi": "माँ या बहन को बहुत दर्दनाक पीरियड्स या एंडोमेट्रियोसिस?",
"mr": "आई किंवा बहिणीला खूप वेदनादायक पाळी किंवा एंडोमेट्रिओसिस?"
}
}
],
"thyroid": [
{
"code": "how_long_thyroid",
"q": {
"en": "How long have you been feeling this way — weeks, months, or over a year?",
"hi": "यह तकलीफ कितने समय से — हफ्ते, महीने, या एक साल से ज़्यादा?",
"mr": "हा त्रास किती दिवसांपासून — आठवडे, महिने, वर्षापेक्षा जास्त?"
}
},
{
"code": "fatigue_after_sleep",
"q": {
"en": "Is the tiredness there even after a full night's sleep — on most days?",
"hi": "रात की पूरी नींद के बाद भी थकान — अधिकांश दिन?",
"mr": "रात्री पूर्ण झोपेनंतरही थकवा — बहुतेक दिवस?"
}
},
{
"code": "mental_fog",
"q": {
"en": "Do you feel mentally slow or foggy — difficulty concentrating or forgetting things more than before?",
"hi": "दिमागी रूप से धीमा — ध्यान लगाने में कठिनाई या पहले से ज़्यादा भूल?",
"mr": "मानसिकदृष्ट्या मंद — लक्ष केंद्रित करण्यात अडचण?"
}
},
{
"code": "cold_intolerance",
"q": {
"en": "Do you feel unusually cold when others are comfortable — always needing extra layers?",
"hi": "दूसरों के आरामदायक होने पर भी ठंड — हमेशा ज़्यादा कपड़े?",
"mr": "इतरांना आरामदायक वाटत असताना थंडी — नेहमी जास्त कपडे?"
}
},
{
"code": "heat_intolerance",
"q": {
"en": "Or the opposite — unusually hot and sweaty when others are comfortable?",
"hi": "या उल्टा — दूसरों के आरामदायक होने पर बहुत गर्मी और पसीना?",
"mr": "किंवा उलटे — इतरांना आरामदायक वाटत असताना खूप उष्णता?"
}
},
{
"code": "weight_change",
"q": {
"en": "Has your weight changed without trying — going up or down without diet change?",
"hi": "बिना कोशिश वजन बदला — बढ़ा या घटा?",
"mr": "प्रयत्नाशिवाय वजन बदलले?"
}
},
{
"code": "hair_falling",
"q": {
"en": "Is your hair falling more than before — in handfuls when combing?",
"hi": "बाल पहले से ज़्यादा झड़ रहे हैं — कंघी पर?",
"mr": "केस पूर्वीपेक्षा जास्त गळतायत?"
}
},
{
"code": "dry_skin",
"q": {
"en": "Is your skin becoming dry or rough — even when the weather hasn't changed?",
"hi": "त्वचा सूखी या खुरदरी — मौसम न बदला हो तब भी?",
"mr": "त्वचा कोरडी किंवा खडबडीत — वातावरण न बदलताही?"
}
},
{
"code": "constipation",
"q": {
"en": "Have you been experiencing constipation — less frequent or harder stools than usual?",
"hi": "कब्ज़ हो रहा है — पहले से कम या कठोर मल?",
"mr": "बद्धकोष्ठता होतेय?"
}
},
{
"code": "neck_swelling",
"q": {
"en": "Any swelling or fullness at the front of your neck — or tightness when you swallow?",
"hi": "गर्दन के सामने सूजन या भरापन — या निगलते वक्त कसाव?",
"mr": "मानेच्या समोरील भागात सूज किंवा गिळताना घट्टपणा?"
}
},
{
"code": "period_change_thyroid",
"q": {
"en": "Have your periods changed — becoming heavier, more irregular, or stopping?",
"hi": "पीरियड्स बदले हैं — भारी, अनियमित, या बंद?",
"mr": "पाळी बदलली आहे — जड, अनियमित, किंवा बंद?"
}
},
{
"code": "family_thyroid",
"q": {
"en": "Does anyone in your family — mother or sister — have a thyroid problem?",
"hi": "परिवार में माँ या बहन को थायराइड?",
"mr": "कुटुंबात आई किंवा बहीण — थायरॉईडची समस्या?"
}
}
],
"metabolic": [
{
"code": "how_long_meta",
"q": {
"en": "How long have you been having these symptoms — weeks, months, or longer?",
"hi": "ये लक्षण कितने समय से — हफ्ते, महीने, या ज़्यादा?",
"mr": "ही लक्षणे किती दिवसांपासून?"
}
},
{
"code": "thirst",
"q": {
"en": "Do you feel very thirsty often — even after drinking water?",
"hi": "अक्सर बहुत प्यास — पानी पीने के बाद भी?",
"mr": "वारंवार खूप तहान — पाणी पिल्यानंतरही?"
}
},
{
"code": "frequent_urination",
"q": {
"en": "Do you pass urine very frequently — especially waking up more than once at night?",
"hi": "बार-बार पेशाब — रात में एक से ज़्यादा बार?",
"mr": "वारंवार लघवी — रात्री एकापेक्षा जास्त वेळा?"
}
},
{
"code": "wound_healing",
"q": {
"en": "Do cuts or wounds take longer than usual to heal?",
"hi": "कट या घाव ठीक होने में ज़्यादा समय?",
"mr": "जखमा बरे होण्यास जास्त वेळ?"
}
},
{
"code": "tingling",
"q": {
"en": "Any tingling, numbness, or burning in your hands or feet?",
"hi": "हाथ-पैरों में झनझनाहट, सुन्नता, या जलन?",
"mr": "हात-पायांमध्ये मुंग्या, सुन्नपणा, जळजळ?"
}
},
{
"code": "blurred_vision",
"q": {
"en": "Any blurred vision that comes and goes?",
"hi": "धुंधला दिखना जो आता-जाता है?",
"mr": "अंधुक दिसणे जे येते आणि जाते?"
}
},
{
"code": "skin_tags",
"q": {
"en": "Do you have small skin tags — soft fleshy growths on your neck or underarms?",
"hi": "गर्दन या बगल में छोटी मांस की गांठें?",
"mr": "मान किंवा काखेत लहान मांसाचे गोळे?"
}
},
{
"code": "family_diabetes",
"q": {
"en": "Does anyone in your family — parents or siblings — have diabetes?",
"hi": "परिवार में माँ-बाप या भाई-बहन — मधुमेह?",
"mr": "कुटुंबात आई-बाबा किंवा भाऊ-बहीण — मधुमेह?"
}
},
{
"code": "frequent_infections",
"q": {
"en": "Do you get frequent infections — skin, urinary, or fungal — that take long to clear?",
"hi": "बार-बार संक्रमण — त्वचा, मूत्र, या फंगल?",
"mr": "वारंवार संक्रमण — त्वचा, मूत्र, बुरशीजन्य?"
}
}
],
"breast": [
{
"code": "main_symptom",
"q": {
"en": "Tell me about your main breast concern — is it a lump, pain, nipple discharge, skin change, or shape change?",
"hi": "मुख्य स्तन चिंता — गांठ, दर्द, निपल रिसाव, त्वचा बदलाव, या आकार बदलाव?",
"mr": "मुख्य स्तन काळजी — गाठ, दुखणे, निपल स्राव, त्वचेत बदल, आकारात बदल?"
}
},
{
"code": "symptom_duration",
"q": {
"en": "How long have you noticed this?",
"hi": "यह कितने समय से है?",
"mr": "हे किती दिवसांपासून आहे?"
}
},
{
"code": "lump_detail",
"q": {
"en": "If there is a lump — is it painful or painless? Hard or soft? Does it move when pressed?",
"hi": "अगर गांठ है — दर्दनाक या दर्दरहित? कठोर या मुलायम? दबाने पर हिलती है?",
"mr": "गाठ असल्यास — दुखते का? कठीण की मऊ? दाबल्यावर हलते का?"
}
},
{
"code": "skin_changes",
"q": {
"en": "Any skin changes — dimpling, puckering, redness, or orange-peel texture?",
"hi": "त्वचा में बदलाव — धंसना, सिकुड़न, लालिमा, या संतरे जैसी?",
"mr": "त्वचेत बदल — खड्डे, सुरकुत्या, लालसरपणा, संत्र्याच्या सालीसारखी?"
}
},
{
"code": "nipple_changes",
"q": {
"en": "Any nipple changes — new inversion, a non-healing sore, or discharge?",
"hi": "निपल में बदलाव — नया अंदर धंसना, न ठीक होने वाला घाव, या रिसाव?",
"mr": "निपलमध्ये बदल — नवीन आत ओढणे, जखम, किंवा स्राव?"
}
},
{
"code": "discharge_type",
"q": {
"en": "If there is nipple discharge — what colour? Blood-stained or brownish is concerning; milky or clear is usually hormonal.",
"hi": "निपल रिसाव का रंग? खून जैसा या भूरा चिंताजनक है; दूधिया या साफ आमतौर पर हार्मोनल।",
"mr": "निपल स्राव कोणत्या रंगाचा? रक्तमिश्रित किंवा तपकिरी — चिंताजनक; पांढरा — सहसा हार्मोनल."
}
},
{
"code": "family_breast",
"q": {
"en": "Has any close family member — mother, sister, grandmother — had breast cancer? At what age?",
"hi": "परिवार में — माँ, बहन, दादी — को स्तन कैंसर? किस उम्र में?",
"mr": "कुटुंबात — आई, बहीण, आजी — ला स्तनाचा कर्करोग? कोणत्या वयात?"
}
},
{
"code": "menstrual_history",
"q": {
"en": "At what age did your periods start? Have you reached menopause?",
"hi": "पीरियड्स किस उम्र में शुरू हुए? रजोनिवृत्ति हो गई है?",
"mr": "पाळी कोणत्या वयात सुरू झाली? रजोनिवृत्ती झाली का?"
}
},
{
"code": "prior_biopsy",
"q": {
"en": "Have you ever had a breast biopsy, or been told about dense breasts or atypical cells?",
"hi": "कभी स्तन बायोप्सी, या घने स्तन, असामान्य कोशिकाओं के बारे में बताया गया?",
"mr": "कधी स्तन बायोप्सी, दाट स्तन, किंवा असामान्य पेशींबद्दल सांगितले गेले?"
}
},
{
"code": "hormone_use",
"q": {
"en": "Have you used hormone treatments for many years — the combined pill or HRT?",
"hi": "कई सालों तक हार्मोन उपचार — कंबाइंड पिल या HRT?",
"mr": "अनेक वर्षे हार्मोन उपचार — कंबाइंड पिल किंवा HRT?"
}
}
],
"general": [
{
"code": "how_long_general",
"q": {
"en": "How long has this been going on — a few days, weeks, or months?",
"hi": "यह कितने समय से — कुछ दिन, हफ्ते, या महीने?",
"mr": "हे किती दिवसांपासून आहे?"
}
},
{
"code": "other_symptoms",
"q": {
"en": "Apart from what you mentioned, anything else — appetite, sleep, mood, or any other worry?",
"hi": "जो बताया उसके अलावा — भूख, नींद, मूड, या कोई और?",
"mr": "आणखी काही — भूक, झोप, मूड, किंवा इतर?"
}
}
]
};

export const SYMPTOM_SWEEP: Question[] = [
{
"code": "sw_tired",
"q": {
"en": "How would you describe your energy — do you feel unusually tired or weak most days?",
"hi": "आपकी ऊर्जा कैसी है — ज़्यादातर दिन असामान्य रूप से थकान या कमज़ोरी महसूस होती है?",
"mr": "तुमची ऊर्जा कशी आहे — बहुतेक दिवस असामान्यपणे थकवा किंवा अशक्तपणा जाणवतो?"
},
"followups": [
{
"trigger": [
"yes",
"हाँ",
"हो",
"होय",
"हा",
"tired",
"थकान",
"थकवा",
"weak"
],
"code": "sw_tired_type",
"q": {
"en": "Is the tiredness there even after a full night's sleep? And have you been feeling dizzy or breathless on exertion?",
"hi": "रात की पूरी नींद के बाद भी थकान? और मेहनत पर चक्कर या सांस फूलना?",
"mr": "रात्री पूर्ण झोपेनंतरही थकवा? आणि श्रमावर चक्कर किंवा दम लागणे?"
}
}
]
},
{
"code": "sw_periods",
"q": {
"en": "Are your periods regular and normal — or are they irregular, very heavy, very painful, or have they changed recently?",
"hi": "आपके पीरियड्स नियमित और सामान्य हैं — या अनियमित, बहुत भारी, बहुत दर्दनाक, या हाल में बदले हैं?",
"mr": "तुमची पाळी नियमित आणि सामान्य आहे — की अनियमित, खूप जड, खूप वेदनादायक, किंवा अलीकडे बदलली?"
},
"followups": [
{
"trigger": [
"irregular",
"अनियमित",
"heavy",
"भारी",
"painful",
"दर्द",
"changed",
"बदले"
],
"code": "sw_periods_detail",
"q": {
"en": "How long has it been like this — and has the flow, colour, or pain been changing over time?",
"hi": "यह कितने समय से है — और प्रवाह, रंग, या दर्द समय के साथ बदल रहे हैं?",
"mr": "हे किती दिवसांपासून आहे — आणि प्रवाह, रंग, किंवा वेदना वेळानुसार बदलत आहेत?"
}
}
]
},
{
"code": "sw_weight_hair",
"q": {
"en": "Has your weight changed without trying? And has your hair been falling more than before, or is your skin getting dry?",
"hi": "बिना कोशिश वजन बदला? और बाल पहले से ज़्यादा झड़ रहे हैं, या त्वचा सूखी हो रही है?",
"mr": "प्रयत्नाशिवाय वजन बदलले? आणि केस जास्त गळतायत, किंवा त्वचा कोरडी होतेय?"
}
},
{
"code": "sw_headache_bp",
"q": {
"en": "Do you get headaches — especially in the morning, or at the back of the head?",
"hi": "सिरदर्द होता है — खासकर सुबह, या सिर के पीछे?",
"mr": "डोकेदुखी होते — विशेषतः सकाळी, किंवा डोक्याच्या मागे?"
}
},
{
"code": "sw_thirst_sugar",
"q": {
"en": "Do you feel very thirsty often, pass urine frequently, or have wounds that take long to heal?",
"hi": "अक्सर बहुत प्यास, बार-बार पेशाब, या घाव ठीक होने में बहुत समय लगता है?",
"mr": "वारंवार तहान, वारंवार लघवी, किंवा जखमा बरे होण्यास खूप वेळ?"
}
},
{
"code": "sw_cold_hot",
"q": {
"en": "Do you feel unusually cold when others are comfortable, or unusually hot and sweaty?",
"hi": "दूसरों के आरामदायक होने पर आपको असामान्य ठंड या असामान्य गर्मी और पसीना?",
"mr": "इतरांना आरामदायक वाटत असताना असामान्य थंडी किंवा उष्णता आणि घाम?"
},
"followups": [
{
"trigger": [
"cold",
"ठंड",
"thandi",
"always"
],
"code": "sw_thyroid_hint",
"q": {
"en": "Feeling cold all the time — along with tiredness and hair fall — is a classic thyroid sign. Has your neck ever looked swollen?",
"hi": "हर समय ठंड — थकान और बाल झड़ने के साथ — थायराइड का क्लासिक संकेत है। गर्दन कभी सूजी दिखी?",
"mr": "नेहमी थंडी — थकवा आणि केस गळण्यासह — थायरॉईडचे क्लासिक लक्षण. मान कधी सुजलेली दिसली?"
}
}
]
},
{
"code": "sw_breast",
"q": {
"en": "Any breast concern — a lump, pain, nipple discharge, or skin change?",
"hi": "कोई स्तन चिंता — गांठ, दर्द, निपल रिसाव, या त्वचा बदलाव?",
"mr": "कोणती स्तन काळजी — गाठ, दुखणे, निपल स्राव, किंवा त्वचेत बदल?"
}
},
{
"code": "sw_anything_else",
"q": {
"en": "Is there anything specific that's been worrying you most — something you want to make sure we check?",
"hi": "कोई विशेष चिंता जो सबसे ज़्यादा परेशान कर रही है — कुछ जो आप ज़रूर जाँचना चाहती हैं?",
"mr": "काही विशिष्ट काळजी जी सर्वाधिक त्रास देतेय — काहीतरी जे तुम्हाला नक्की तपासायचे आहे?"
}
}
];

export const INTAKE_QUESTIONS: Question[] = [
{
"code": "intake_duration",
"q": {
"en": "How long have you been feeling this way — a few days, a few weeks, or several months?",
"hi": "यह तकलीफ कितने समय से है — कुछ दिन, कुछ हफ्ते, या कई महीने?",
"mr": "हा त्रास किती दिवसांपासून आहे — काही दिवस, काही आठवडे, किंवा कित्येक महिने?"
}
},
{
"code": "intake_severity",
"q": {
"en": "How much is this affecting your daily life — is it a mild inconvenience, or is it stopping you from work or normal activities?",
"hi": "यह आपकी दिनचर्या को कितना प्रभावित कर रहा है — थोड़ी असुविधा, या काम और सामान्य गतिविधियों में बाधा?",
"mr": "हे तुमच्या दैनंदिन जीवनावर किती परिणाम करत आहे — थोडी गैरसोय, की काम आणि सामान्य कामांमध्ये अडथळा?"
}
},
{
"code": "intake_associated",
"q": {
"en": "Aside from what you told me, have you noticed any other changes lately — unusual tiredness, changes in weight, hair, sleep, mood, or periods?",
"hi": "जो बताया उसके अलावा, हाल में कोई और बदलाव — असामान्य थकान, वजन, बाल, नींद, मूड, या पीरियड्स में बदलाव?",
"mr": "सांगितल्याशिवाय, अलीकडे इतर कोणते बदल — असामान्य थकवा, वजन, केस, झोप, मूड, किंवा पाळीत बदल?"
},
"followups": [
{
"trigger": [
"tired",
"tiredness",
"थकान",
"थकवा",
"fatigue",
"exhausted",
"weak",
"kamjor"
],
"code": "intake_tired_detail",
"q": {
"en": "You mentioned tiredness — is it there even after a good night's sleep, or only after physical activity?",
"hi": "थकान के बारे में — रात की अच्छी नींद के बाद भी, या सिर्फ शारीरिक गतिविधि के बाद?",
"mr": "थकव्याबद्दल — रात्री चांगल्या झोपेनंतरही, किंवा फक्त शारीरिक हालचालीनंतर?"
}
},
{
"trigger": [
"period",
"periods",
"पीरियड",
"पाळी",
"irregular",
"heavy",
"painful",
"maasik"
],
"code": "intake_period_detail",
"q": {
"en": "You mentioned period changes — are they irregular, heavier than before, more painful, or have they stopped?",
"hi": "पीरियड में बदलाव — अनियमित, पहले से भारी, ज़्यादा दर्दनाक, या बंद हो गए?",
"mr": "पाळीत बदल — अनियमित, पूर्वीपेक्षा जड, जास्त वेदनादायक, किंवा बंद झाली?"
}
},
{
"trigger": [
"hair",
"बाल",
"केस",
"falling",
"jhad",
"गळणे",
"loss"
],
"code": "intake_hair_detail",
"q": {
"en": "Hair changes — is it falling more than before, thinning at the top, or changes in texture?",
"hi": "बालों में बदलाव — पहले से ज़्यादा झड़ रहे, ऊपर से पतले, या बनावट में बदलाव?",
"mr": "केसांमध्ये बदल — पूर्वीपेक्षा जास्त गळणे, वरून विरळ, किंवा पोतात बदल?"
}
},
{
"trigger": [
"weight",
"वजन",
"gained",
"lost",
"बढ़ा",
"घटा",
"वाढले",
"कमी"
],
"code": "intake_weight_detail",
"q": {
"en": "Weight changes — have you gained or lost weight without trying, and roughly how much over how long?",
"hi": "वजन में बदलाव — बिना कोशिश किए बढ़ा या घटा, और लगभग कितना और कितने समय में?",
"mr": "वजनातील बदल — प्रयत्नाशिवाय वाढले किंवा कमी झाले, किती आणि किती वेळात?"
}
}
]
},
{
"code": "intake_stress",
"q": {
"en": "Has anything changed significantly in your life recently — major stress, changes in diet or routine, illness, or a major life event?",
"hi": "हाल में जीवन में कोई बड़ा बदलाव — ज़्यादा तनाव, खान-पान या दिनचर्या में बदलाव, बीमारी, या कोई बड़ी घटना?",
"mr": "अलीकडे जीवनात कोणते मोठे बदल — जास्त तणाव, आहार किंवा दिनक्रमात बदल, आजारपण, किंवा मोठी घटना?"
}
},
{
"code": "intake_previous_treatment",
"q": {
"en": "Have you seen a doctor for this before? And are you taking any medicines or supplements currently?",
"hi": "इसके लिए पहले डॉक्टर से मिली हैं? और अभी कोई दवाई या सप्लीमेंट ले रही हैं?",
"mr": "याआधी यासाठी डॉक्टरांना भेटलात? आणि सध्या कोणती औषधे किंवा सप्लीमेंट्स घेत आहात?"
}
}
];

export const STT_VARIANTS: Record<string, string[]> = {
"yes": [
"yes",
"ya",
"yeah",
"haan",
"han",
"haa",
"ha",
"ji",
"sure",
"ok",
"okay",
"accha",
"bilkul",
"thik"
],
"no": [
"no",
"nahi",
"nahin",
"nah",
"nope",
"never",
"mat",
"na",
"nako",
"nai"
],
"heavy": [
"heavy",
"bhari",
"jyada",
"zyada",
"bhot",
"lot",
"2 hours",
"tu avars",
"avars",
"evri",
"every"
],
"irregular": [
"irregular",
"aniyamit",
"skip",
"skipping",
"late",
"delay",
"let",
"vans",
"mahine"
],
"cold": [
"cold",
"thanda",
"thandi",
"always cold",
"extra layer",
"chand"
],
"hot": [
"hot",
"garam",
"garmi",
"sweaty",
"paseena",
"heat"
],
"pain": [
"pain",
"dard",
"dukh",
"severe",
"bad",
"stop",
"ruk",
"bed",
"cant go"
],
"dark": [
"dark",
"brown",
"kala",
"gahara",
"kaala",
"almost black",
"clot",
"gauth"
]
};

export const CONDITION_DISPLAY: Record<string, string> = {
"pcos": "PCOS / PCOD",
"anaemia": "Anaemia",
"thyroid": "Thyroid Dysfunction",
"hypertension": "High Blood Pressure",
"endometriosis": "Endometriosis",
"metabolic": "Metabolic / Pre-Diabetes",
"metabolic_enhanced": "Metabolic Syndrome",
"breast": "Breast Health",
"amenorrhea": "Amenorrhoea",
"general": "General Health"
};

export const CONDITION_DEVICES: Record<string, string[]> = {
"pcos": [
"lh_fsh",
"testosterone",
"glucose"
],
"anaemia": [
"haemoglobin",
"ferritin"
],
"hypertension": [
"urine"
],
"endometriosis": [
"haemoglobin"
],
"thyroid": [
"tsh"
],
"metabolic": [
"glucose",
"hba1c"
],
"breast": [
"cbe"
],
"amenorrhea": [
"pregnancy_test",
"prolactin",
"lh_fsh",
"tsh"
],
"metabolic_enhanced": [
"glucose",
"hba1c",
"lipid",
"waist"
],
"general": []
};

export const DEVICE_DEFS: Record<string, { name: string; unit: string; delay?: number; ranges?: unknown }> = {
"bp": {
"name": "Blood Pressure",
"unit": "mmHg",
"delay": 4,
"ranges": {
"low": {
"s": [
90,
119
],
"d": [
60,
79
],
"l": "Normal",
"f": "green"
},
"mid": {
"s": [
120,
139
],
"d": [
80,
89
],
"l": "Elevated",
"f": "amber"
},
"high": {
"s": [
140,
175
],
"d": [
90,
110
],
"l": "High",
"f": "red"
}
}
},
"spo2": {
"name": "SpO2",
"unit": "%",
"delay": 3,
"ranges": {
"low": [
97,
100,
"Normal",
"green"
],
"mid": [
94,
96,
"Low",
"amber"
],
"high": [
85,
93,
"Very Low",
"red"
]
}
},
"weight": {
"name": "Weight/BMI",
"unit": "kg/BMI",
"delay": 2,
"ranges": {
"low": [
18.5,
24.9,
"Healthy BMI",
"green"
],
"mid": [
25,
29.9,
"Overweight",
"amber"
],
"high": [
30,
42,
"Obese",
"red"
]
}
},
"lh_fsh": {
"name": "LH/FSH Ratio",
"unit": "",
"delay": 5,
"ranges": {
"low": [
0.5,
1.5,
"Normal",
"green"
],
"mid": [
1.6,
2.5,
"Borderline",
"amber"
],
"high": [
2.6,
8.0,
"Elevated — PCOS Marker",
"red"
]
}
},
"testosterone": {
"name": "Testosterone",
"unit": "ng/dL",
"delay": 5,
"ranges": {
"low": [
10,
49,
"Normal",
"green"
],
"mid": [
50,
70,
"Slightly Elevated",
"amber"
],
"high": [
71,
150,
"Elevated",
"red"
]
}
},
"haemoglobin": {
"name": "Haemoglobin",
"unit": "g/dL",
"delay": 5,
"ranges": {
"low": [
12,
14.5,
"Normal",
"green"
],
"mid": [
9,
11.9,
"Mild Anaemia",
"amber"
],
"high": [
4,
8.9,
"Severe Anaemia",
"red"
]
}
},
"ferritin": {
"name": "Ferritin",
"unit": "ng/mL",
"delay": 5,
"ranges": {
"low": [
30,
150,
"Normal",
"green"
],
"mid": [
12,
29,
"Low-Normal",
"amber"
],
"high": [
2,
11,
"Low — Iron Deficiency",
"red"
]
}
},
"glucose": {
"name": "Blood Glucose",
"unit": "mg/dL",
"delay": 4,
"ranges": {
"low": [
70,
99,
"Normal",
"green"
],
"mid": [
100,
125,
"Pre-diabetic",
"amber"
],
"high": [
126,
250,
"Diabetic Range",
"red"
]
}
},
"tsh": {
"name": "TSH",
"unit": "mIU/L",
"delay": 5,
"ranges": {
"low": [
0.4,
4.5,
"Normal",
"green"
],
"mid": [
4.6,
10,
"Borderline High",
"amber"
],
"high": [
10.1,
50,
"High — Hypothyroid",
"red"
]
}
},
"hba1c": {
"name": "HbA1c",
"unit": "%",
"delay": 5,
"ranges": {
"low": [
4,
5.6,
"Normal",
"green"
],
"mid": [
5.7,
6.4,
"Pre-diabetic",
"amber"
],
"high": [
6.5,
12,
"Diabetic Range",
"red"
]
}
},
"ecg": {
"name": "ECG",
"unit": "",
"delay": 6,
"ranges": {
"low": [
0,
0,
"Normal Sinus Rhythm",
"green"
],
"mid": [
1,
1,
"Minor Changes",
"amber"
],
"high": [
2,
2,
"Significant Changes",
"red"
]
}
},
"urine": {
"name": "Urine Protein",
"unit": "",
"delay": 3,
"ranges": {
"low": [
0,
0,
"Negative",
"green"
],
"mid": [
1,
1,
"Trace",
"amber"
],
"high": [
2,
2,
"Positive",
"red"
]
}
},
"pregnancy_test": {
"name": "Pregnancy Test",
"unit": "",
"delay": 2,
"ranges": {
"low": [
0,
0,
"Negative",
"green"
],
"mid": [
1,
1,
"Faint Positive",
"amber"
],
"high": [
2,
2,
"Positive",
"red"
]
}
},
"prolactin": {
"name": "Prolactin (Aaha device)",
"unit": "ng/mL",
"delay": 5,
"ranges": {
"low": [
2,
25,
"Normal",
"green"
],
"mid": [
26,
50,
"Mildly Elevated",
"amber"
],
"high": [
51,
200,
"High — Pituitary Signal",
"red"
]
}
},
"lipid": {
"name": "Lipid Panel (Aaha device)",
"unit": "mg/dL",
"delay": 5,
"ranges": {
"low": [
150,
199,
"Borderline Cholesterol",
"green"
],
"mid": [
200,
239,
"Elevated",
"amber"
],
"high": [
240,
350,
"High Cholesterol",
"red"
]
}
},
"waist": {
"name": "Waist Circumference",
"unit": "cm",
"delay": 1,
"ranges": {
"low": [
60,
79,
"Normal (Asian <80cm)",
"green"
],
"mid": [
80,
89,
"Elevated — Asian Risk",
"amber"
],
"high": [
90,
130,
"High — Metabolic Risk",
"red"
]
}
},
"cbe": {
"name": "Clinical Breast Exam",
"unit": "",
"delay": 4,
"ranges": {
"low": [
0,
0,
"Normal",
"green"
],
"mid": [
1,
1,
"Nodularity Noted",
"amber"
],
"high": [
2,
2,
"Lump / Concerning Finding",
"red"
]
}
}
};

export const NUTRITION_PLANS: Record<string, { title: string; points: string[] }> = {
"pcos": {
"title": "PCOS Nutrition Plan",
"points": [
"Low glycaemic diet — millets, brown rice, oats instead of white rice and maida",
"Small frequent meals every 3-4 hours to prevent insulin spikes",
"Lean protein at every meal — lentils, eggs, paneer",
"Anti-inflammatory foods daily — turmeric, flaxseeds, walnuts",
"Spearmint tea once daily — may help reduce excess androgens",
"Avoid sugar, sugary drinks, packaged and fried snacks completely"
]
},
"thyroid": {
"title": "Thyroid Nutrition Plan",
"points": [
"Use iodised salt every day — essential for thyroid hormone",
"Selenium-rich foods — Brazil nuts, sunflower seeds, eggs",
"Zinc-rich foods — pumpkin seeds, chickpeas, lentils",
"Take thyroid medication on empty stomach 30-60 min before food",
"Avoid large amounts of raw cabbage, cauliflower, or soy in excess"
]
},
"anaemia": {
"title": "Iron-Deficiency Anaemia Nutrition Plan",
"points": [
"Iron-rich foods at every meal — spinach, drumstick leaves, lentils, rajma, liver, eggs",
"Squeeze lemon or eat tomatoes with every iron meal — doubles absorption",
"Avoid tea, coffee within 1 hour of iron-rich meals — blocks 60% absorption",
"Jaggery and sesame (til) daily — traditional high-iron combination",
"Cook in iron vessels — increases iron content of food"
]
},
"hypertension": {
"title": "Blood Pressure Nutrition Plan",
"points": [
"Reduce salt to less than 5g/day — 1 teaspoon total including all cooking",
"Eliminate pickles, papads, canned food, packaged snacks — very high in hidden salt",
"Potassium-rich foods daily — banana, sweet potato, coconut water, spinach",
"Garlic in daily cooking — natural BP reducer",
"DASH diet — more fruits, vegetables, whole grains, less processed food"
]
},
"metabolic": {
"title": "Diabetes / Pre-Diabetes Nutrition Plan",
"points": [
"Replace white rice, maida with millets (jowar, bajra), whole wheat, oats",
"Half your plate should be non-starchy vegetables at every meal",
"Protein at every meal prevents sugar spikes — dal, eggs, curd, paneer",
"No fruit juices or sugary drinks — eat whole fruit only",
"Bitter gourd (karela) and fenugreek seeds daily — natural regulators",
"Eat dinner before 8 PM, never skip breakfast"
]
},
"endometriosis": {
"title": "Endometriosis Nutrition Plan",
"points": [
"Anti-inflammatory diet — omega-3 foods: fish, walnuts, flaxseeds daily",
"Reduce red meat and processed meat",
"High fibre daily — helps eliminate excess oestrogen",
"Turmeric with black pepper every day — reduces prostaglandins that cause pain",
"Avoid trans fats, excess sugar, and alcohol completely"
]
},
"amenorrhea": {
"title": "Amenorrhoea Nutrition Plan",
"points": [
"Eat enough calories — undernutrition and extreme dieting are leading causes of period loss",
"Iron-rich foods daily if periods recently stopped and anaemia possible — lentils, spinach, eggs",
"Calcium and Vitamin D — dairy, sesame, sunlight — crucial for bone health when periods are absent",
"Avoid extreme low-fat diets — the body needs healthy fats to produce hormones",
"Stress management and adequate sleep — key for restoring hypothalamic function",
"If PCOS-related: low-GI diet same as PCOS plan"
]
},
"metabolic_enhanced": {
"title": "Metabolic Syndrome / Diabetes Prevention Plan",
"points": [
"Replace white rice and maida with millets (jowar, bajra), whole wheat — India-specific: these are affordable and effective",
"Half your plate vegetables at every meal — non-starchy preferred (cucumber, spinach, beans)",
"Protein at every meal prevents sugar spikes — dal, paneer, eggs, chicken",
"No sugary tea, cold drinks, or packaged biscuits — the biggest hidden sugar sources in India",
"Bitter gourd (karela) and fenugreek seeds (methi) daily — proven natural regulators",
"Measure waist monthly — even without weight change, waist reduction shows metabolic improvement",
"Walk 30-45 minutes after each meal — this alone can reduce post-meal sugar by 20-30%"
]
},
"breast": {
"title": "Breast Health Nutrition Plan",
"points": [
"Maintain healthy weight — obesity raises breast cancer risk post-menopause",
"Limit alcohol — even small amounts regularly increase risk",
"Anti-inflammatory foods — turmeric, omega-3, berries, green tea",
"High fibre daily — helps eliminate excess oestrogen",
"Cruciferous vegetables — broccoli, cauliflower (support hormone balance)"
]
},
"general": {
"title": "General Wellness Plan",
"points": [
"Balanced meals — 50% vegetables, 25% protein, 25% whole grains",
"8-10 glasses water daily",
"Limit processed food, excess sugar, and salt",
"Three regular meals — never skip breakfast"
]
}
};

export const THERAPY_PLANS: Record<string, string[]> = {
"pcos": [
"Yoga 30 min daily for hormonal balance (Supta Baddha Konasana, Viparita Karani)",
"Strength training 3x/week — improves insulin sensitivity",
"7-8 hours sleep — poor sleep worsens insulin resistance",
"Centre: Hormonal consultation, Nutritionist, Weight management"
],
"thyroid": [
"Moderate exercise 30 min daily — boosts thyroid metabolism",
"Adequate sleep — thyroid restores during deep sleep",
"Centre: TSH monitoring every 3 months, Endocrinologist consultation"
],
"anaemia": [
"Rest more than usual — no heavy exertion until haemoglobin improves",
"Centre: IV iron therapy if oral iron fails, Nutritionist, Gynaecologist if heavy periods are cause"
],
"hypertension": [
"30-minute brisk walk every morning — reduces BP 5-8 mmHg",
"Yoga and Pranayama breathing — 10 min Anulom Vilom daily",
"Identify and reduce stress triggers",
"Centre: Regular BP monitoring, Cardiologist if ECG changes"
],
"metabolic": [
"Walk 30-45 min after each meal — most effective way to lower post-meal sugar",
"Resistance training 3x/week",
"Even 5-7% weight loss reduces diabetes risk by 58%",
"Centre: Diabetes educator, Glucometer training, Dietitian"
],
"endometriosis": [
"Heat therapy during period — hot water bottle reduces cramping",
"Gentle yoga — avoid inversions during menstruation",
"Omega-3 supplements reduce inflammatory prostaglandins",
"Centre: Gynaecology consultation, Laparoscopy evaluation, Pelvic physiotherapy"
],
"breast": [
"Monthly breast self-examination — same time each month",
"Annual clinical breast exam at Centre",
"Maintain healthy weight and exercise 150 min/week",
"Centre: Clinical exam, Mammogram (40+) or Ultrasound referral"
],
"general": [
"30-minute walk daily",
"Sleep 7-8 hours",
"Stress management",
"Centre: Annual health check, Nutritionist"
]
};

