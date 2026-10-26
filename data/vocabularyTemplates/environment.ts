import { DifficultyLevel, VocabularyTemplate } from '../../types';

export const ENVIRONMENT_TEMPLATES: VocabularyTemplate[] = [
  {
    id: 'env-a1',
    name: 'Thời tiết & thiên nhiên',
    topic: 'General Communication',
    cefrLevel: DifficultyLevel.A1,
    words: ['sun', 'rain', 'wind', 'cloud', 'snow', 'hot', 'cold', 'tree', 'flower', 'river', 'mountain', 'sea'],
    meanings: ['mặt trời', 'mưa', 'gió', 'đám mây', 'tuyết', 'nóng', 'lạnh', 'cây', 'hoa', 'dòng sông', 'ngọn núi', 'biển'],
    samplePreview: ['rain', 'cloud', 'river', 'mountain'],
  },
  {
    id: 'env-a2',
    name: 'Bảo vệ môi trường',
    topic: 'General Communication',
    cefrLevel: DifficultyLevel.A2,
    words: ['recycle', 'rubbish', 'plastic', 'pollution', 'energy', 'waste', 'bin', 'nature', 'environment', 'protect', 'reuse', 'litter'],
    meanings: ['tái chế', 'rác', 'nhựa', 'ô nhiễm', 'năng lượng', 'chất thải, lãng phí', 'thùng rác', 'thiên nhiên', 'môi trường', 'bảo vệ', 'tái sử dụng', 'xả rác bừa bãi'],
    samplePreview: ['recycle', 'plastic', 'pollution', 'protect'],
  },
  {
    id: 'env-b1',
    name: 'Biến đổi khí hậu',
    topic: 'Academic & IELTS',
    cefrLevel: DifficultyLevel.B1,
    words: ['climate change', 'global warming', 'greenhouse gas', 'flood', 'drought', 'temperature', 'fossil fuel', 'solar power', 'wildlife', 'habitat', 'extinction', 'rainforest'],
    meanings: ['biến đổi khí hậu', 'nóng lên toàn cầu', 'khí nhà kính', 'lũ lụt', 'hạn hán', 'nhiệt độ', 'nhiên liệu hoá thạch', 'năng lượng mặt trời', 'động vật hoang dã', 'môi trường sống', 'sự tuyệt chủng', 'rừng mưa nhiệt đới'],
    samplePreview: ['climate change', 'greenhouse gas', 'drought', 'fossil fuel'],
  },
  {
    id: 'env-c2',
    name: 'Chính sách môi trường',
    topic: 'Academic & IELTS',
    cefrLevel: DifficultyLevel.C2,
    words: ['carbon neutrality', 'decarbonisation', 'anthropogenic', 'desertification', 'ecological footprint', 'emissions trading', 'net zero', 'biodegradable', 'geoengineering', 'resource depletion', 'environmental degradation', 'carbon offset'],
    meanings: ['trung hoà carbon', 'khử carbon', 'do con người gây ra', 'sa mạc hoá', 'dấu chân sinh thái', 'mua bán phát thải', 'phát thải ròng bằng không', 'phân huỷ sinh học được', 'địa kỹ thuật khí hậu', 'cạn kiệt tài nguyên', 'suy thoái môi trường', 'bù trừ carbon'],
    samplePreview: ['anthropogenic', 'desertification', 'net zero', 'biodegradable'],
  },
];
