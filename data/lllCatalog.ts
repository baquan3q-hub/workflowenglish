import type { LllEditorial, LllKind, LllLevel, LllTopic } from '../services/lllLogic';

type Source = [url: string, publisher: string, minutes: number, title: string, description: string, level: LllLevel, kind: LllKind];

function picks(topic: LllTopic, sources: Source[]): LllEditorial[] {
  return sources.map(([url, publisher, minutes, title, description, level, kind]) => ({
    url, publisher, minutes, title, description, level, kind, topic, language: 'en' as const,
  }));
}

/*
 * English reading and viewing for the Lifelong Learning library.
 *
 * Every link was opened and checked on 2026-11-24. Minutes: videos use the
 * length YouTube reports; BBC "6 Minute English" uses the programme length;
 * pages use their word count at about 150 words a minute (a learner's pace).
 * Learning Scientists and Cloudflare pages keep the earlier editorial estimate
 * because they cannot be counted without a browser. Levels are editorial:
 * Simple English Wikipedia and NASA Space Place A2, learner news (VOA, BBC
 * Learning English) B1, TED and The Conversation B2, essays C1.
 */
export const LLL_CATALOG = [
  ...picks('tech', [
    ['https://simple.wikipedia.org/wiki/Internet', 'Simple English Wikipedia', 7, 'Internet', 'Internet là gì và các máy tính nói chuyện với nhau ra sao, viết bằng tiếng Anh đơn giản.', 'A2', 'explainer'],
    ['https://simple.wikipedia.org/wiki/Computer_virus', 'Simple English Wikipedia', 6, 'Computer virus', 'Virus máy tính lây lan thế nào và cách tự bảo vệ.', 'A2', 'explainer'],
    ['https://www.cloudflare.com/learning/dns/what-is-dns/', 'Cloudflare', 7, 'What is DNS?', 'Theo dấu một tên miền từ trình duyệt đến địa chỉ máy chủ.', 'B1', 'explainer'],
    ['https://www.cloudflare.com/learning/ssl/what-is-https/', 'Cloudflare', 5, 'What is HTTPS?', 'Chữ S trên thanh địa chỉ bảo vệ kết nối của bạn như thế nào.', 'B1', 'explainer'],
    ['https://learningenglish.voanews.com/a/japan-s-toyota-builds-a-city-like-center-to-test-robotics-ai/7987758.html', 'VOA Learning English', 6, 'Japan’s Toyota Builds a City-like Center to Test Robotics, AI', 'Toyota dựng hẳn một khu phố thử nghiệm để thử robot và AI trong đời sống thật.', 'B1', 'article'],
    ['https://www.youtube.com/watch?v=40riCqvRoMs', 'TED', 18, 'How we teach computers to understand pictures', 'Fei-Fei Li kể chuyện dạy máy tính “nhìn” ảnh như một đứa trẻ học nói.', 'B1', 'video'],
    ['https://www.youtube.com/watch?v=LPZh9BOjkQs', '3Blue1Brown', 8, 'Large language models explained briefly', 'Minh họa trực quan cách mô hình ngôn ngữ đoán từ tiếp theo.', 'B2', 'video'],
    ['https://www.youtube.com/watch?v=aircAruvnKk', '3Blue1Brown', 19, 'But what is a neural network?', 'Mạng nơ-ron nhận ra chữ số viết tay thế nào, giải thích bằng hình động.', 'C1', 'video'],
    ['https://theconversation.com/why-ai-enabled-scientific-research-is-a-double-edged-sword-295916', 'The Conversation', 8, 'Why AI-enabled scientific research is a double-edged sword', 'AI giúp khoa học đi nhanh hơn, nhưng cũng mang lại những rủi ro mới.', 'C1', 'perspective'],
    ['https://theconversation.com/who-gets-to-decide-whether-an-ai-data-centre-has-a-social-licence-to-operate-295729', 'The Conversation', 7, 'Who gets to decide whether an AI data centre has a ‘social licence’ to operate?', 'Ai có quyền quyết định một trung tâm dữ liệu AI có được đặt cạnh cộng đồng mình?', 'C1', 'perspective'],
  ]),
  ...picks('skills', [
    ['https://www.learningscientists.org/retrieval-practice', 'The Learning Scientists', 5, 'Retrieval practice', 'Gấp sách lại và tự gọi lại kiến thức: cách ôn hiệu quả nhất.', 'B1', 'explainer'],
    ['https://www.learningscientists.org/spaced-practice', 'The Learning Scientists', 5, 'Spaced practice', 'Chia thời gian ôn thành nhiều buổi ngắn thay vì học dồn.', 'B1', 'explainer'],
    ['https://www.learningscientists.org/interleaving', 'The Learning Scientists', 5, 'Interleaving', 'Xen kẽ các dạng bài để luyện cách chọn phương pháp phù hợp.', 'B1', 'explainer'],
    ['https://www.learningscientists.org/elaboration', 'The Learning Scientists', 5, 'Elaboration', 'Tự hỏi “vì sao” và “như thế nào” để hiểu sâu hơn điều vừa học.', 'B1', 'explainer'],
    ['https://www.learningscientists.org/dual-coding', 'The Learning Scientists', 5, 'Dual coding', 'Kết hợp chữ và hình để nhớ lâu hơn.', 'B1', 'explainer'],
    ['https://www.youtube.com/watch?v=TjPFZaMe2yw', 'TED-Ed', 5, '3 tips on how to study effectively', 'Ba kỹ thuật học qua câu chuyện của sinh viên y khoa.', 'B1', 'video'],
    ['https://www.youtube.com/watch?v=f2O6mQkFiiw', 'TED-Ed', 5, 'How to practice effectively… for just about anything', 'Luyện tập thế nào để tiến bộ thật, áp dụng cho mọi kỹ năng.', 'B1', 'video'],
    ['https://www.youtube.com/watch?v=MMmOLN5zBLY', 'TED-Ed', 5, 'The benefits of a bilingual brain', 'Biết hai ngôn ngữ thay đổi bộ não ra sao.', 'B1', 'video'],
    ['https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2026/ep-260910', 'BBC Learning English', 6, 'Can apps teach you a language?', 'Bài nghe 6 phút kèm bản chép lời: ứng dụng có thật sự dạy được ngoại ngữ?', 'B1', 'article'],
    ['https://en.wikipedia.org/wiki/Pomodoro_Technique', 'Wikipedia', 5, 'Pomodoro Technique', 'Phương pháp làm việc 25 phút, nghỉ 5 phút đến từ đâu và vận hành thế nào.', 'B2', 'explainer'],
    ['https://www.youtube.com/watch?v=H14bBuluwB8', 'TED', 6, 'Grit: The power of passion and perseverance', 'Angela Duckworth: bền bỉ quan trọng hơn năng khiếu như thế nào.', 'B2', 'video'],
    ['https://www.youtube.com/watch?v=arj7oStGLkU', 'TED', 14, 'Inside the mind of a master procrastinator', 'Tim Urban kể chuyện trì hoãn rất hài, và vì sao ai cũng trì hoãn.', 'B2', 'video'],
    ['https://psyche.co/guides/how-to-take-notes-that-actually-help-you-learn', 'Psyche', 8, 'How to take notes that actually help you learn', 'Cách ghi chép giúp bạn hiểu và nhớ, không chỉ chép lại.', 'B2', 'explainer'],
    ['https://psyche.co/guides/how-to-be-a-word-detective', 'Psyche', 14, 'How to be a word detective', 'Lần theo nguồn gốc của từ để hiểu và nhớ từ vựng tốt hơn.', 'C1', 'explainer'],
    ['https://paulgraham.com/read.html', 'Paul Graham', 3, 'The Need to Read', 'Một bài luận ngắn: vì sao đọc và viết giúp ta suy nghĩ.', 'C1', 'perspective'],
    ['https://paulgraham.com/writes.html', 'Paul Graham', 4, 'Writes and Write-Nots', 'Khi AI viết thay, điều gì xảy ra với khả năng suy nghĩ của con người?', 'C1', 'perspective'],
    ['https://paulgraham.com/procrastination.html', 'Paul Graham', 12, 'Good and Bad Procrastination', 'Có kiểu trì hoãn tốt: gác việc nhỏ để làm việc lớn.', 'C1', 'perspective'],
  ]),
  ...picks('life', [
    ['https://spaceplace.nasa.gov/blue-sky/en/', 'NASA Space Place', 5, 'Why is the sky blue?', 'Vì sao ánh sáng xanh tán xạ mạnh hơn trong khí quyển.', 'A2', 'explainer'],
    ['https://spaceplace.nasa.gov/moon-phases/en/', 'NASA Space Place', 5, 'What are the Moon’s phases?', 'Các pha Mặt Trăng qua vị trí của Mặt Trời, Trái Đất và Mặt Trăng.', 'A2', 'explainer'],
    ['https://spaceplace.nasa.gov/seasons/en/', 'NASA Space Place', 5, 'What causes the seasons?', 'Độ nghiêng của Trái Đất tạo ra bốn mùa như thế nào.', 'A2', 'explainer'],
    ['https://spaceplace.nasa.gov/black-holes/en/', 'NASA Space Place', 3, 'What is a black hole?', 'Hố đen là gì, giải thích ngắn gọn cho người mới.', 'A2', 'explainer'],
    ['https://spaceplace.nasa.gov/aurora/en/', 'NASA Space Place', 4, 'What is an aurora?', 'Cực quang hình thành thế nào khi gió Mặt Trời chạm vào Trái Đất.', 'A2', 'explainer'],
    ['https://simple.wikipedia.org/wiki/Photosynthesis', 'Simple English Wikipedia', 10, 'Photosynthesis', 'Cây biến ánh sáng thành thức ăn ra sao.', 'A2', 'explainer'],
    ['https://learningenglish.voanews.com/a/methods-for-protecting-earth-against-an-asteroid-strike/7989189.html', 'VOA Learning English', 6, 'Methods for Protecting Earth against an Asteroid Strike', 'Các nhà khoa học tính cách bảo vệ Trái Đất khỏi tiểu hành tinh.', 'B1', 'article'],
    ['https://learningenglish.voanews.com/a/scientists-link-gene-to-human-speech/7985890.html', 'VOA Learning English', 6, 'Scientists Link Gene to Human Speech', 'Một gene có thể liên quan đến khả năng nói của con người.', 'B1', 'article'],
    ['https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2026/ep-260924', 'BBC Learning English', 6, 'Why do we itch?', 'Bài nghe 6 phút kèm bản chép lời: điều gì khiến ta thấy ngứa.', 'B1', 'article'],
    ['https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2026/ep-260827', 'BBC Learning English', 6, 'How do we describe smells?', 'Bài nghe 6 phút kèm bản chép lời: vì sao mùi hương khó tả bằng lời.', 'B1', 'article'],
    ['https://www.youtube.com/watch?v=2W85Dwxx218', 'TED-Ed', 6, 'Why do we dream?', 'Những giả thuyết khoa học về giấc mơ.', 'B1', 'video'],
    ['https://www.youtube.com/watch?v=zQGOcOUBi6s', 'Kurzgesagt', 8, 'The immune system explained', 'Hệ miễn dịch phản ứng thế nào khi vi khuẩn xâm nhập.', 'B2', 'video'],
  ]),
  ...picks('society', [
    ['https://simple.wikipedia.org/wiki/Culture', 'Simple English Wikipedia', 6, 'Culture', 'Văn hóa là gì: ngôn ngữ, phong tục, nghệ thuật và cách ta sống cùng nhau.', 'A2', 'explainer'],
    ['https://learningenglish.voanews.com/a/wilbur-and-orville-wright-the-first-airplane/7998765.html', 'VOA Learning English', 4, 'Wilbur and Orville Wright: The First Airplane', 'Chuyện hai anh em nhà Wright và chiếc máy bay đầu tiên.', 'B1', 'article'],
    ['https://learningenglish.voanews.com/a/what-is-art-deco-and-why-is-it-popular-again-/7935369.html', 'VOA Learning English', 6, 'What Is Art Deco and Why Is It Popular Again?', 'Phong cách Art Deco là gì và vì sao được yêu thích trở lại.', 'B1', 'article'],
    ['https://learningenglish.voanews.com/a/researchers-uncover-a-bathhouse-complex-in-ancient-pompeii/7946203.html', 'VOA Learning English', 4, 'Researchers Uncover a Bathhouse Complex in Ancient Pompeii', 'Phát hiện khu nhà tắm cổ ở Pompeii kể gì về đời sống La Mã.', 'B1', 'article'],
    ['https://learningenglish.voanews.com/a/knitting-while-watching-movies-gains-popularity-/7990808.html', 'VOA Learning English', 6, 'Knitting While Watching Movies Gains Popularity', 'Đan len trong rạp phim: một thú vui mới đang lan rộng.', 'B1', 'article'],
    ['https://www.youtube.com/watch?v=R1vskiVDwl4', 'TED', 12, '10 ways to have a better conversation', 'Celeste Headlee: mười cách để trò chuyện hay hơn, bắt đầu từ việc lắng nghe.', 'B1', 'video'],
    ['https://waitbutwhy.com/2015/12/the-tail-end.html', 'Wait But Why', 8, 'The Tail End', 'Đếm số lần còn lại được gặp người thân: một góc nhìn khiến ta nghĩ lại về thời gian.', 'B2', 'perspective'],
    ['https://theconversation.com/as-the-school-year-settles-in-making-room-for-the-arts-can-support-everyday-well-being-293514', 'The Conversation', 7, 'Making room for the arts can support everyday well-being', 'Dành chỗ cho nghệ thuật trong năm học giúp tinh thần học sinh thế nào.', 'B2', 'article'],
    ['https://theconversation.com/woven-baskets-arent-just-aesthetically-pleasing-materials-science-research-finds-theyre-sturdier-and-more-resilient-than-stiff-containers-265567', 'The Conversation', 7, 'Woven baskets aren’t just aesthetically pleasing', 'Khoa học vật liệu cho thấy giỏ đan bền hơn hộp cứng.', 'B2', 'article'],
    ['https://theconversation.com/the-tourism-industry-is-slowly-waking-up-to-solo-travelers-needs-291494', 'The Conversation', 9, 'The tourism industry is slowly waking up to solo travelers’ needs', 'Du lịch một mình ngày càng phổ biến, ngành du lịch đang thay đổi theo.', 'B2', 'article'],
    ['https://www.youtube.com/watch?v=MBRqu0YOH14', 'Kurzgesagt', 7, 'Optimistic Nihilism', 'Nếu vũ trụ không có ý nghĩa sẵn, ta có thể tự tạo ý nghĩa: một góc nhìn lạc quan.', 'B2', 'video'],
    ['https://www.youtube.com/watch?v=h6fcK_fRYaI', 'Kurzgesagt', 8, 'The Egg – A short story', 'Một truyện ngắn hoạt hình về sự sống, cái chết và lòng trắc ẩn.', 'B2', 'video'],
    ['https://www.youtube.com/watch?v=D9Ihs241zeg', 'TED', 19, 'The danger of a single story', 'Chimamanda Ngozi Adichie: chỉ nghe một câu chuyện về ai đó dẫn đến định kiến.', 'B2', 'video'],
    ['https://www.youtube.com/watch?v=c0KYU2j0TM4', 'TED', 19, 'The power of introverts', 'Susan Cain: người hướng nội có sức mạnh riêng mà xã hội hay bỏ qua.', 'B2', 'video'],
    ['https://www.youtube.com/watch?v=iG9CE55wbtY', 'TED', 20, 'Do schools kill creativity?', 'Ken Robinson: trường học có đang làm mất đi sự sáng tạo của trẻ?', 'B2', 'video'],
    ['https://ourworldindata.org/much-better-awful-can-be-better', 'Our World in Data', 14, 'The world is awful. The world is much better. The world can be much better.', 'Ba câu nghe như mâu thuẫn nhưng đều đúng, nhìn qua dữ liệu.', 'C1', 'perspective'],
  ]),
  ...picks('work', [
    ['https://simple.wikipedia.org/wiki/Money', 'Simple English Wikipedia', 7, 'Money', 'Tiền là gì, ra đời thế nào và làm được những gì.', 'A2', 'explainer'],
    ['https://simple.wikipedia.org/wiki/Inflation', 'Simple English Wikipedia', 5, 'Inflation', 'Lạm phát là gì và vì sao giá cả tăng theo thời gian.', 'A2', 'explainer'],
    ['https://learningenglish.voanews.com/a/saying-no-at-work-can-be-good-for-your-health/7945653.html', 'VOA Learning English', 7, 'Saying ‘No’ at Work Can Be Good for Your Health', 'Biết nói “không” ở nơi làm việc tốt cho sức khỏe ra sao.', 'B1', 'article'],
    ['https://learningenglish.voanews.com/a/mary-kay-a-leader-in-the-beauty-product-industry/7972740.html', 'VOA Learning English', 5, 'Mary Kay: A Leader in the Beauty Product Industry', 'Câu chuyện khởi nghiệp của Mary Kay trong ngành mỹ phẩm.', 'B1', 'article'],
    ['https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2026/ep-261015', 'BBC Learning English', 6, 'Why do people buy gold?', 'Bài nghe 6 phút kèm bản chép lời: vì sao người ta mua vàng.', 'B1', 'article'],
    ['https://www.youtube.com/watch?v=p7HKvqRI_Bo', 'TED-Ed', 5, 'How does the stock market work?', 'Thị trường chứng khoán vận hành thế nào, kể từ lịch sử ra đời.', 'B1', 'video'],
    ['https://www.youtube.com/watch?v=fLJsdqxnZb0', 'TED', 12, 'The happy secret to better work', 'Shawn Achor: hạnh phúc trước giúp làm việc tốt hơn, không phải ngược lại.', 'B2', 'video'],
    ['https://www.youtube.com/watch?v=7Pq-S557XQU', 'CGP Grey', 15, 'What happened to horses is happening to us', 'Máy móc từng thay thế ngựa, liệu tự động hóa có thay thế con người?', 'B2', 'video'],
    ['https://www.youtube.com/watch?v=qp0HIF3SfI4', 'TED', 19, 'How great leaders inspire action', 'Simon Sinek: bắt đầu từ “vì sao” để truyền cảm hứng.', 'B2', 'video'],
    ['https://theconversation.com/why-its-more-important-than-ever-to-jump-start-entrepreneurial-careers-from-the-college-classroom-292831', 'The Conversation', 10, 'Jump-starting entrepreneurial careers from the college classroom', 'Vì sao nên bắt đầu học khởi nghiệp ngay từ đại học.', 'B2', 'article'],
    ['https://theconversation.com/as-ai-reshapes-jobs-and-workers-change-industries-employers-need-to-be-more-flexible-too-292000', 'The Conversation', 6, 'As AI reshapes jobs, employers need to be more flexible too', 'Khi AI thay đổi việc làm, nhà tuyển dụng cũng phải thay đổi.', 'C1', 'perspective'],
    ['https://theconversation.com/with-ai-blamed-for-mass-layoffs-heres-how-we-can-ensure-workers-get-a-fairer-go-296948', 'The Conversation', 7, 'With AI blamed for mass layoffs, here’s how workers can get a fairer go', 'AI bị đổ lỗi cho làn sóng sa thải: làm sao để người lao động được đối xử công bằng.', 'C1', 'perspective'],
    ['https://paulgraham.com/hwh.html', 'Paul Graham', 22, 'How to Work Hard', 'Làm việc chăm chỉ là gì, và vì sao nó khó hơn ta nghĩ.', 'C1', 'perspective'],
    ['https://paulgraham.com/ds.html', 'Paul Graham', 29, 'Do Things that Don’t Scale', 'Startup nên làm cả những việc thủ công, không mở rộng được, ở giai đoạn đầu.', 'C1', 'perspective'],
  ]),
  ...picks('planet', [
    ['https://simple.wikipedia.org/wiki/Recycling', 'Simple English Wikipedia', 3, 'Recycling', 'Tái chế là gì và những vật liệu nào tái chế được.', 'A2', 'explainer'],
    ['https://simple.wikipedia.org/wiki/Climate_change', 'Simple English Wikipedia', 14, 'Climate change', 'Biến đổi khí hậu: nguyên nhân, hậu quả và cách ứng phó.', 'A2', 'explainer'],
    ['https://spaceplace.nasa.gov/greenhouse/en/', 'NASA Space Place', 9, 'The greenhouse effect', 'Hiệu ứng nhà kính giữ nhiệt cho Trái Đất như thế nào.', 'A2', 'explainer'],
    ['https://education.nationalgeographic.org/resource/renewable-resources/', 'National Geographic Education', 8, 'Renewable resources', 'Năng lượng mặt trời, gió, nước: những nguồn tài nguyên tái tạo.', 'B1', 'explainer'],
    ['https://learningenglish.voanews.com/a/study-shows-how-earth-s-orbit-affects-ice-ages/7997495.html', 'VOA Learning English', 5, 'Study Shows How Earth’s Orbit Affects Ice Ages', 'Quỹ đạo Trái Đất ảnh hưởng thế nào đến các kỷ băng hà.', 'B1', 'article'],
    ['https://learningenglish.voanews.com/a/how-to-reduce-risks-of-bad-air-quality/7980912.html', 'VOA Learning English', 7, 'How to Reduce Risks of Bad Air Quality', 'Cách giảm tác hại khi không khí ô nhiễm.', 'B1', 'article'],
    ['https://learningenglish.voanews.com/a/using-real-trees-to-bring-nature-indoors/7945659.html', 'VOA Learning English', 7, 'Using Real Trees to Bring Nature Indoors', 'Đưa cây thật vào nhà để sống gần thiên nhiên hơn.', 'B1', 'article'],
    ['https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2026/ep-261029', 'BBC Learning English', 6, 'Is aircon the answer to a heating world?', 'Bài nghe 6 phút kèm bản chép lời: điều hòa có phải lời giải cho Trái Đất nóng lên?', 'B1', 'article'],
    ['https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2026/ep-260903', 'BBC Learning English', 6, 'Climate change and extreme weather', 'Bài nghe 6 phút kèm bản chép lời: biến đổi khí hậu và thời tiết cực đoan.', 'B1', 'article'],
    ['https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2026/ep-261119', 'BBC Learning English', 6, 'Are microplastics harming us?', 'Bài nghe 6 phút kèm bản chép lời: vi nhựa có đang hại sức khỏe con người?', 'B1', 'article'],
    ['https://theconversation.com/insects-on-these-sub-antarctic-islands-are-bouncing-back-after-invasive-rats-and-mice-were-eradicated-295347', 'The Conversation', 8, 'Insects on sub-Antarctic islands are bouncing back', 'Côn trùng hồi sinh sau khi chuột xâm lấn bị loại bỏ khỏi đảo.', 'B2', 'article'],
    ['https://www.youtube.com/watch?v=yiw6_JakZFc', 'Kurzgesagt', 16, 'Can YOU fix climate change?', 'Hành động cá nhân và thay đổi hệ thống: điều gì thật sự giảm khí thải.', 'B2', 'video'],
    ['https://theconversation.com/concrete-and-steel-or-mangroves-and-forests-when-it-comes-to-climate-adaptation-nature-is-much-cheaper-292462', 'The Conversation', 7, 'Concrete and steel, or mangroves and forests?', 'Thích ứng khí hậu bằng thiên nhiên rẻ hơn nhiều so với bê tông.', 'C1', 'perspective'],
    ['https://theconversation.com/shifting-the-cleanup-cost-of-packaging-waste-to-companies-could-encourage-greener-packaging-but-only-if-states-are-aligned-284283', 'The Conversation', 7, 'Shifting the cleanup cost of packaging waste to companies', 'Bắt doanh nghiệp trả chi phí rác bao bì có giúp bao bì xanh hơn?', 'C1', 'perspective'],
  ]),
  ...picks('health', [
    ['https://simple.wikipedia.org/wiki/Sleep', 'Simple English Wikipedia', 16, 'Sleep', 'Giấc ngủ là gì, các giai đoạn ngủ và vì sao ta cần ngủ.', 'A2', 'explainer'],
    ['https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/', 'NHS', 5, '5 steps to mental wellbeing', 'Năm việc nhỏ mỗi ngày giúp tinh thần khỏe hơn.', 'B1', 'explainer'],
    ['https://learningenglish.voanews.com/a/how-daylight-savings-time-affects-health/8001173.html', 'VOA Learning English', 6, 'How Daylight Saving Time Affects Health', 'Đổi giờ mùa hè ảnh hưởng thế nào đến cơ thể.', 'B1', 'article'],
    ['https://learningenglish.voanews.com/a/what-is-the-healthiest-way-to-prepare-vegetables-/7967294.html', 'VOA Learning English', 7, 'What Is the Healthiest Way to Prepare Vegetables?', 'Luộc, hấp hay ăn sống: cách nào giữ dinh dưỡng của rau tốt nhất.', 'B1', 'article'],
    ['https://learningenglish.voanews.com/a/how-to-lower-your-risk-of-dementia-starting-in-middle-age/7937612.html', 'VOA Learning English', 7, 'How to Lower Your Risk of Dementia Starting in Middle Age', 'Những thói quen từ tuổi trung niên giúp giảm nguy cơ sa sút trí tuệ.', 'B1', 'article'],
    ['https://learningenglish.voanews.com/a/what-is-the-best-kind-of-yoga-for-beginners-/7953499.html', 'VOA Learning English', 7, 'What Is the Best Kind of Yoga for Beginners?', 'Người mới tập yoga nên bắt đầu với kiểu nào.', 'B1', 'article'],
    ['https://learningenglish.voanews.com/a/experts-provide-tips-for-avoiding-computer-linked-vision-trouble/7953508.html', 'VOA Learning English', 7, 'Experts Provide Tips for Avoiding Computer-linked Vision Trouble', 'Cách bảo vệ mắt khi phải nhìn màn hình cả ngày.', 'B1', 'article'],
    ['https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2026/ep-261022', 'BBC Learning English', 6, 'What should you eat for a better night’s sleep?', 'Bài nghe 6 phút kèm bản chép lời: ăn gì để ngủ ngon hơn.', 'B1', 'article'],
    ['https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2026/ep-261001', 'BBC Learning English', 6, 'Why does heartbreak hurt so much?', 'Bài nghe 6 phút kèm bản chép lời: vì sao thất tình lại đau đến vậy.', 'B1', 'article'],
    ['https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2026/ep-260917', 'BBC Learning English', 6, 'Is rejection good for us?', 'Bài nghe 6 phút kèm bản chép lời: bị từ chối có mặt tốt nào không.', 'B1', 'article'],
    ['https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2026/ep-261008', 'BBC Learning English', 6, 'Are people drinking less alcohol?', 'Bài nghe 6 phút kèm bản chép lời: xu hướng uống ít rượu bia hơn.', 'B1', 'article'],
    ['https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2026/ep-261105', 'BBC Learning English', 6, 'Could vaccines cure cancer?', 'Bài nghe 6 phút kèm bản chép lời: vắc-xin có thể chữa ung thư?', 'B1', 'article'],
    ['https://www.youtube.com/watch?v=z-IR48Mb3W0', 'TED-Ed', 4, 'What is depression?', 'Trầm cảm là gì và khác với buồn bã thông thường thế nào.', 'B1', 'video'],
    ['https://www.youtube.com/watch?v=lEXBxijQREo', 'TED-Ed', 5, 'How sugar affects the brain', 'Đường tác động lên não và vì sao ta thèm đồ ngọt.', 'B1', 'video'],
    ['https://www.youtube.com/watch?v=wUEl8KrMz14', 'TED-Ed', 5, 'Why sitting is bad for you', 'Ngồi lâu ảnh hưởng thế nào đến cơ thể.', 'B1', 'video'],
    ['https://www.youtube.com/watch?v=xyQY8a-ng6g', 'TED-Ed', 5, 'How the food you eat affects your brain', 'Thức ăn ảnh hưởng đến trí nhớ và tâm trạng ra sao.', 'B1', 'video'],
    ['https://www.youtube.com/watch?v=8KkKuTCFvzI', 'TED', 13, 'What makes a good life? Lessons from the longest study on happiness', 'Robert Waldinger: bài học từ nghiên cứu hạnh phúc kéo dài 75 năm.', 'B1', 'video'],
    ['https://theconversation.com/a-brief-history-of-the-food-pyramid-and-its-many-false-starts-295690', 'The Conversation', 8, 'A brief history of the food pyramid', 'Tháp dinh dưỡng đã thay đổi bao nhiêu lần, và vì sao.', 'B2', 'article'],
    ['https://www.youtube.com/watch?v=n3Xv_g3g-mA', 'Kurzgesagt', 13, 'Loneliness', 'Cô đơn là gì, vì sao nó nguy hiểm và cách thoát ra.', 'B2', 'video'],
    ['https://www.youtube.com/watch?v=RcGyVTAoXEU', 'TED', 14, 'How to make stress your friend', 'Kelly McGonigal: cách nhìn về căng thẳng thay đổi tác động của nó.', 'B2', 'video'],
    ['https://www.youtube.com/watch?v=F2hc2FLOdhI', 'TED', 17, 'Why we all need to practice emotional first aid', 'Guy Winch: chăm sóc vết thương tinh thần như chăm sóc vết thương cơ thể.', 'B2', 'video'],
    ['https://www.youtube.com/watch?v=5MuIMqhT8DM', 'TED', 19, 'Sleep is your superpower', 'Matt Walker: điều gì xảy ra với cơ thể và trí nhớ khi thiếu ngủ.', 'B2', 'video'],
    ['https://psyche.co/guides/how-to-handle-jealous-feelings', 'Psyche', 9, 'How to handle jealous feelings', 'Hiểu và xử lý cảm giác ghen tị một cách lành mạnh.', 'C1', 'explainer'],
  ]),
] satisfies readonly LllEditorial[];
