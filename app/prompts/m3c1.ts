// app/prompts/m3c1.ts

export type PromptItem = {
  name: string;
  prompt: string;
};

// ====== PROMPTS (12 variações) ======
export const PROMPTS: PromptItem[] = [
  {
    name: "new_angle_01",
    prompt:
      "change the camera angle of the given image. Editorial architectural photograph. Daylight scene with diffuse neutral sky, soft contrast, realistic reflections on glass and metallic materials. Keep all proportions and materials identical to the reference image.",
  },
  {
    name: "new_angle_02",
    prompt:
      "close-up editorial photograph with a 50mm lens, zoomed on façade and volumetric articulation. Warm evening light (4000 K), long shadows, natural contrast. Maintain strict consistency with materials, color, and geometry from the original image. Slight tilt-up camera framing for a dynamic architectural feel.",
  },
  {
    name: "model_axo_white",
    prompt:
      "High-resolution totally white architectural model, axonometric view from above, on urban context white base, showing all volumetric details, window openings, terraces, circulation paths, and structural articulation. Maintain consistent details and proportions from the image reference. Uniform matte white material with soft shadows. Neutral daylight environment, seamless white background. Style of museum architectural model photography from SANAA or OMA exhibitions.",
  },
  {
    name: "model_axo_wood",
    prompt:
      "Detailed architectural model totally made of light balsa wood, viewed from above in axonometric projection, on urban context wood base, Fine-grain wood textures showing contour lines, volumetric recesses, terraces, and façade articulation. Maintain consistent details and proportions from the image reference. Neutral studio lighting with soft white background. Shot in editorial model photography style, precise and tactile realism.",
  },
  {
    name: "night_view",
    prompt:
      "Night-time editorial photograph of the same architectural scene, identical composition and camera angle as reference. Warm interior lighting (2800 K), cool exterior reflections, visible depth of field and subtle atmospheric haze. Consistent proportions, materials, and façade rhythm. Urban ambient light and reflections on glass surfaces; cinematic realism.",
  },
  {
    name: "sketch_b&w",
    prompt:
      "Hand-drawn architectural sketch from the reference image, 2-point perspective. keeping proportions, geometry, and materials consistent. Drawn with a fine black ink pen on a white textured paper, with soft gray pencil shading. Expressive linework, architectural perspective, and clear massing. Captures the essence of the project in a spontaneous design moment.",
  },
  {
    name: "technical_detail",
    prompt:
      "Highly detailed architectural technical drawing of a key construction detail — façade joint, structural connection, or sunshade system. Drawn with precise linework, hatching, and material indications. Black ink on white background, 1:5 scale representation. Realistic shadows and textures, like a competition presentation board detail.",
  },
  {
    name: "interior_01",
    prompt:
      "Interior photography consistent with the building from the base image. Furniture layout coherent with the project’s geometry. Editorial realism, camera at 1.5 m height, 35 mm lens.",
  },
  {
    name: "interior_02",
    prompt:
      "Alternative interior photography focusing on spatial depth and light quality. Material consistency (same palette and texture fidelity as base image). Subtle human presence, volumetric clarity, and precise architectural lighting. Editorial composition in the style of Architectural Digest or Wallpaper magazine.",
  },
  {
    name: "detailed_section",
    prompt:
      "Architectural section drawing through the main volume, precise structure, slabs, and circulation paths. Realistic materials and textures (concrete, glazing, vegetation). Hybrid style combining linework and shaded volumes. Editorial layout with light gray background and graphic scale. Same geometry and proportions as base image.",
  },
  {
    name: "watercolor",
    prompt:
      "Hand-drawn architectural sketch of the same project, fine ink lines with soft watercolor wash. Slight paper texture visible, light touches of color for shadows and glazing. Perspective view capturing essence of form and massing. Artistic representation in the style of Álvaro Siza or Toyo Ito sketchbooks.",
  },
  {
    name: "facade_details",
    prompt:
      "Perspective section of the building’s façade, showing only a cropped portion with full constructive realism. Cut through structure, glazing, mullions, and cladding layers, exposing insulation, shading devices, and fixings in precise alignment. Keep all materials, colors, and proportions identical to the reference image. Depict accurate junctions between floor slabs, curtain wall, and façade panels. Soft daylight (5500 K), neutral white background, subtle ambient shadows. Presented in the style of MVRDV or BIG competition boards — a didactic yet photorealistic perspective detail revealing architectural logic and tectonic beauty.",
  },
];
