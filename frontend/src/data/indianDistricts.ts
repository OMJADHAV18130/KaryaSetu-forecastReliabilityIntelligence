export interface DistrictLocation {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  zone: 'North' | 'South' | 'East' | 'West' | 'Central' | 'North-East' | 'Islands';
}

export const INDIAN_DISTRICTS: DistrictLocation[] = [
  // Northern Region
  { id: 'leh', name: 'Leh', state: 'Ladakh', latitude: 34.1526, longitude: 77.5771, zone: 'North' },
  { id: 'kargil', name: 'Kargil', state: 'Ladakh', latitude: 34.5539, longitude: 76.1349, zone: 'North' },
  { id: 'srinagar', name: 'Srinagar', state: 'Jammu & Kashmir', latitude: 34.0837, longitude: 74.7973, zone: 'North' },
  { id: 'jammu', name: 'Jammu', state: 'Jammu & Kashmir', latitude: 32.7266, longitude: 74.8570, zone: 'North' },
  { id: 'shimla', name: 'Shimla', state: 'Himachal Pradesh', latitude: 31.1048, longitude: 77.1734, zone: 'North' },
  { id: 'dharamshala', name: 'Kangra / Dharamshala', state: 'Himachal Pradesh', latitude: 32.2190, longitude: 76.3234, zone: 'North' },
  { id: 'dehradun', name: 'Dehradun', state: 'Uttarakhand', latitude: 30.3165, longitude: 78.0322, zone: 'North' },
  { id: 'nainital', name: 'Nainital', state: 'Uttarakhand', latitude: 29.3919, longitude: 79.4542, zone: 'North' },
  { id: 'amritsar', name: 'Amritsar', state: 'Punjab', latitude: 31.6340, longitude: 74.8723, zone: 'North' },
  { id: 'ludhiana', name: 'Ludhiana', state: 'Punjab', latitude: 30.9010, longitude: 75.8573, zone: 'North' },
  { id: 'chandigarh', name: 'Chandigarh', state: 'Chandigarh', latitude: 30.7333, longitude: 76.7794, zone: 'North' },
  { id: 'karnal', name: 'Karnal', state: 'Haryana', latitude: 29.6857, longitude: 76.9905, zone: 'North' },
  { id: 'delhi', name: 'New Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.2090, zone: 'North' },
  { id: 'gurugram', name: 'Gurugram', state: 'Haryana', latitude: 28.4595, longitude: 77.0266, zone: 'North' },
  { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462, zone: 'North' },
  { id: 'varanasi', name: 'Varanasi', state: 'Uttar Pradesh', latitude: 25.3176, longitude: 82.9739, zone: 'North' },
  { id: 'kanpur', name: 'Kanpur', state: 'Uttar Pradesh', latitude: 26.4499, longitude: 80.3319, zone: 'North' },
  { id: 'prayagraj', name: 'Prayagraj', state: 'Uttar Pradesh', latitude: 25.4358, longitude: 81.8463, zone: 'North' },

  // Western & Central Region
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873, zone: 'West' },
  { id: 'jodhpur', name: 'Jodhpur', state: 'Rajasthan', latitude: 26.2389, longitude: 73.0243, zone: 'West' },
  { id: 'udaipur', name: 'Udaipur', state: 'Rajasthan', latitude: 24.5854, longitude: 73.7125, zone: 'West' },
  { id: 'bhopal', name: 'Bhopal', state: 'Madhya Pradesh', latitude: 23.2599, longitude: 77.4126, zone: 'Central' },
  { id: 'indore', name: 'Indore', state: 'Madhya Pradesh', latitude: 22.7196, longitude: 75.8577, zone: 'Central' },
  { id: 'jabalpur', name: 'Jabalpur', state: 'Madhya Pradesh', latitude: 23.1815, longitude: 79.9864, zone: 'Central' },
  { id: 'raipur', name: 'Raipur', state: 'Chhattisgarh', latitude: 21.2514, longitude: 81.6296, zone: 'Central' },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714, zone: 'West' },
  { id: 'surat', name: 'Surat', state: 'Gujarat', latitude: 21.1702, longitude: 72.8311, zone: 'West' },
  { id: 'rajkot', name: 'Rajkot', state: 'Gujarat', latitude: 22.3039, longitude: 70.8022, zone: 'West' },
  { id: 'mumbai', name: 'Mumbai (Colaba / Santacruz)', state: 'Maharashtra', latitude: 19.0760, longitude: 72.8777, zone: 'West' },
  { id: 'pune', name: 'Pune (Shivajinagar)', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567, zone: 'West' },
  { id: 'nagpur', name: 'Nagpur', state: 'Maharashtra', latitude: 21.1458, longitude: 79.0882, zone: 'West' },
  { id: 'nashik', name: 'Nashik', state: 'Maharashtra', latitude: 19.9975, longitude: 73.7898, zone: 'West' },
  { id: 'panaji', name: 'Panaji', state: 'Goa', latitude: 15.4909, longitude: 73.8278, zone: 'West' },

  // Eastern Region
  { id: 'patna', name: 'Patna', state: 'Bihar', latitude: 25.5941, longitude: 85.1376, zone: 'East' },
  { id: 'gaya', name: 'Gaya', state: 'Bihar', latitude: 24.7914, longitude: 85.0002, zone: 'East' },
  { id: 'ranchi', name: 'Ranchi', state: 'Jharkhand', latitude: 23.3441, longitude: 85.3096, zone: 'East' },
  { id: 'jamshedpur', name: 'Jamshedpur', state: 'Jharkhand', latitude: 22.8046, longitude: 86.2029, zone: 'East' },
  { id: 'kolkata', name: 'Kolkata (Alipore)', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639, zone: 'East' },
  { id: 'siliguri', name: 'Darjeeling / Siliguri', state: 'West Bengal', latitude: 26.7271, longitude: 88.3953, zone: 'East' },
  { id: 'bhubaneswar', name: 'Bhubaneswar', state: 'Odisha', latitude: 20.2961, longitude: 85.8245, zone: 'East' },
  { id: 'puri', name: 'Puri', state: 'Odisha', latitude: 19.8135, longitude: 85.8312, zone: 'East' },

  // Southern Region
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', latitude: 17.3850, longitude: 78.4867, zone: 'South' },
  { id: 'warangal', name: 'Warangal', state: 'Telangana', latitude: 17.9689, longitude: 79.5941, zone: 'South' },
  { id: 'visakhapatnam', name: 'Visakhapatnam', state: 'Andhra Pradesh', latitude: 17.6868, longitude: 83.2185, zone: 'South' },
  { id: 'vijayawada', name: 'Vijayawada', state: 'Andhra Pradesh', latitude: 16.5062, longitude: 80.6480, zone: 'South' },
  { id: 'tirupati', name: 'Tirupati', state: 'Andhra Pradesh', latitude: 13.6288, longitude: 79.4192, zone: 'South' },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, zone: 'South' },
  { id: 'mysuru', name: 'Mysuru', state: 'Karnataka', latitude: 12.2958, longitude: 76.6394, zone: 'South' },
  { id: 'mangaluru', name: 'Mangaluru', state: 'Karnataka', latitude: 12.9141, longitude: 74.8560, zone: 'South' },
  { id: 'chennai', name: 'Chennai (Meenambakkam)', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707, zone: 'South' },
  { id: 'coimbatore', name: 'Coimbatore', state: 'Tamil Nadu', latitude: 11.0168, longitude: 76.9558, zone: 'South' },
  { id: 'madurai', name: 'Madurai', state: 'Tamil Nadu', latitude: 9.9252, longitude: 78.1198, zone: 'South' },
  { id: 'thiruvananthapuram', name: 'Thiruvananthapuram', state: 'Kerala', latitude: 8.5241, longitude: 76.9366, zone: 'South' },
  { id: 'kochi', name: 'Kochi', state: 'Kerala', latitude: 9.9312, longitude: 76.2673, zone: 'South' },
  { id: 'kozhikode', name: 'Kozhikode', state: 'Kerala', latitude: 11.2588, longitude: 75.7804, zone: 'South' },

  // North-East Region
  { id: 'guwahati', name: 'Guwahati (Bhorjhar)', state: 'Assam', latitude: 26.1445, longitude: 91.7362, zone: 'North-East' },
  { id: 'dibrugarh', name: 'Dibrugarh', state: 'Assam', latitude: 27.4728, longitude: 94.9120, zone: 'North-East' },
  { id: 'shillong', name: 'Shillong', state: 'Meghalaya', latitude: 25.5788, longitude: 91.8933, zone: 'North-East' },
  { id: 'itanagar', name: 'Itanagar', state: 'Arunachal Pradesh', latitude: 27.0844, longitude: 93.6053, zone: 'North-East' },
  { id: 'tawang', name: 'Tawang', state: 'Arunachal Pradesh', latitude: 27.5861, longitude: 91.8667, zone: 'North-East' },
  { id: 'imphal', name: 'Imphal', state: 'Manipur', latitude: 24.8170, longitude: 93.9368, zone: 'North-East' },
  { id: 'kohima', name: 'Kohima', state: 'Nagaland', latitude: 25.6751, longitude: 94.1086, zone: 'North-East' },
  { id: 'aizawl', name: 'Aizawl', state: 'Mizoram', latitude: 23.7271, longitude: 92.7176, zone: 'North-East' },
  { id: 'agartala', name: 'Agartala', state: 'Tripura', latitude: 23.8315, longitude: 91.2868, zone: 'North-East' },
  { id: 'gangtok', name: 'Gangtok', state: 'Sikkim', latitude: 27.3389, longitude: 88.6065, zone: 'North-East' },

  // Islands
  { id: 'port-blair', name: 'Port Blair', state: 'Andaman & Nicobar', latitude: 11.6234, longitude: 92.7265, zone: 'Islands' },
  { id: 'kavaratti', name: 'Kavaratti', state: 'Lakshadweep', latitude: 10.5669, longitude: 72.6420, zone: 'Islands' },
];
