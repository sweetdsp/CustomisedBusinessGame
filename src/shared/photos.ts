// Real photographs for the town tiles, from Wikipedia / Wikimedia Commons (free licences; see each article for credits).
// A town without a photo here simply shows a plain coloured tile with its name.
const W = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/';
const p = (path: string, article: string) => ({ url: `${W}${path}`, article: `https://en.wikipedia.org/wiki/${article}` });

export const PHOTOS: Record<string, { url: string; article: string }> = {
  Courtallam: p('f/f5/Courtallam.jpg/500px-Courtallam.jpg', 'Courtallam'),
  Mahabalipuram: p('7/74/Shore_Temple_-Mamallapuram_-Tamil_Nadu_-N-TN-C55.jpg/500px-Shore_Temple_-Mamallapuram_-Tamil_Nadu_-N-TN-C55.jpg', 'Shore_Temple'),
  Kanyakumari: p('5/5b/Vivekananda_Rock_Memorial%2C_Kanyakumari.jpg/500px-Vivekananda_Rock_Memorial%2C_Kanyakumari.jpg', 'Kanyakumari'),
  Rameswaram: p('2/23/Rameswaram_Morning.jpg/500px-Rameswaram_Morning.jpg', 'Rameswaram'),
  Ooty: p('d/db/Ooty_lake.jpg/500px-Ooty_lake.jpg', 'Ooty'),
  Kodaikanal: p('d/da/Boating_in_Kodaikanal_Lake_with_Mist.jpg/500px-Boating_in_Kodaikanal_Lake_with_Mist.jpg', 'Kodaikanal'),
  Wayanad: p('e/e8/Blue%2C_Green_%26_White.jpg/500px-Blue%2C_Green_%26_White.jpg', 'Wayanad_district'),
  Alleppey: p('e/e4/Alappuzha_Boat_Beauty_W.jpg/500px-Alappuzha_Boat_Beauty_W.jpg', 'Alappuzha'),
  Kumarakom: p('5/50/Kumarkom.jpg/500px-Kumarkom.jpg', 'Kumarakom'),
  Varkala: p('4/49/Varkala_Beach%2C_Varkala%2C_Kerala.jpg/500px-Varkala_Beach%2C_Varkala%2C_Kerala.jpg', 'Varkala'),
  Thekkady: p('b/ba/Thekkady.jpg/500px-Thekkady.jpg', 'Thekkady'),
  Munnar: p('b/b9/Munnar_Overview.jpg/500px-Munnar_Overview.jpg', 'Munnar'),
  Badami: p('c/cf/BadamiCaves87.JPG/500px-BadamiCaves87.JPG', 'Badami'),
  Chikmagalur: p('d/db/Chikmagalur%2C_India._%287793316622%29.jpg/500px-Chikmagalur%2C_India._%287793316622%29.jpg', 'Chikmagalur'),
  Udupi: p('d/da/Udupi_Krishna_Temple.jpg/500px-Udupi_Krishna_Temple.jpg', 'Udupi'),
  Gokarna: p('6/66/Main_entry_to_the_Mahabaleshwar_Temple_at_Gokaran.jpg/500px-Main_entry_to_the_Mahabaleshwar_Temple_at_Gokaran.jpg', 'Mahabaleshwar_Temple,_Gokarna'),
  Coorg: p('1/17/Tadiandamol_Valley%2C_Western_Ghats.jpg/500px-Tadiandamol_Valley%2C_Western_Ghats.jpg', 'Kodagu_district'),
  Hampi: p('d/dd/Wide_angle_of_Galigopuram_of_Virupaksha_Temple%2C_Hampi_%2804%29_%28cropped%29.jpg/500px-Wide_angle_of_Galigopuram_of_Virupaksha_Temple%2C_Hampi_%2804%29_%28cropped%29.jpg', 'Hampi'),
  'Nagarjuna Sagar': p('c/c9/NagarjunaSagarDam.JPG/500px-NagarjunaSagarDam.JPG', 'Nagarjuna_Sagar_Dam'),
  Lepakshi: p('0/0a/Front_side_of_Veerabhadra_Temple%2C_Lepakshi.jpg/500px-Front_side_of_Veerabhadra_Temple%2C_Lepakshi.jpg', 'Lepakshi'),
  Puttaparthi: p('9/91/PrashantiNilayam_2.jpg/500px-PrashantiNilayam_2.jpg', 'Puttaparthi'),
  Srisailam: p('c/c0/Srisailam.jpg/500px-Srisailam.jpg', 'Srisailam'),
  Araku: p('b/b0/Araku-valley.jpg/500px-Araku-valley.jpg', 'Araku_Valley'),
  Tirupati: p('4/4e/Tirumala_090615.jpg/500px-Tirumala_090615.jpg', 'Tirupati'),
  Ramappa: p('2/29/Ramappa_Temple_%28Human_Scale%29.jpg/500px-Ramappa_Temple_%28Human_Scale%29.jpg', 'Ramappa_Temple'),
  Basar: p('8/89/Basar_Temple_view_02.jpg/500px-Basar_Temple_view_02.jpg', 'Basara,_Telangana'),
  Yadagirigutta: p('3/30/Yadadri_Temple_on_the_hilltop.jpg/500px-Yadadri_Temple_on_the_hilltop.jpg', 'Sri_Lakshmi_Narasimha_Swamy_Temple,_Yadagirigutta'),
  Warangal: p('c/c3/Shiv_Linga_at_Warangal_Fort_Complex.jpg/500px-Shiv_Linga_at_Warangal_Fort_Complex.jpg', 'Warangal_Fort'),
  Bhadrachalam: p('9/93/Sri_sita_rama_temple_bhadrachalam_temple_view.jpg/500px-Sri_sita_rama_temple_bhadrachalam_temple_view.jpg', 'Bhadrachalam'),
  // Vemulawada: no suitable photo found yet; the tile shows its name on a plain background.
};
