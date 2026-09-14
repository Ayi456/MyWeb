import * as T from "three";
/** The scene owns shared resources. Dispose once, after all objects are detached. */
export class ResourceTracker {
  private geometries = new Set<T.BufferGeometry>();
  private materials = new Set<T.Material>();
  private textures = new Set<T.Texture>();
  private instances = new Set<T.InstancedMesh>();
  private shadows = new Set<T.LightShadow>();
  trackGeometry(geometry: T.BufferGeometry) {
    this.geometries.add(geometry);
  }
  track(root: T.Object3D) {
    root.traverse((object) => {
      if (
        object instanceof T.Mesh ||
        object instanceof T.Line ||
        object instanceof T.Points
      ) {
        this.geometries.add(object.geometry);
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => this.trackMaterial(material));
      }
      if (object instanceof T.Sprite) this.trackMaterial(object.material);
      if (object instanceof T.InstancedMesh) this.instances.add(object);
      if (
        object instanceof T.DirectionalLight ||
        object instanceof T.PointLight
      )
        this.shadows.add(object.shadow);
    });
  }
  trackMaterial(material: T.Material) {
    this.materials.add(material);
    Object.values(material).forEach((value) => {
      if (value instanceof T.Texture) this.textures.add(value);
    });
    if (material instanceof T.ShaderMaterial)
      Object.values(material.uniforms).forEach((uniform) => {
        if (uniform.value instanceof T.Texture)
          this.textures.add(uniform.value);
      });
  }
  dispose() {
    this.instances.forEach((value) => value.dispose());
    this.geometries.forEach((value) => value.dispose());
    this.materials.forEach((value) => value.dispose());
    this.textures.forEach((value) => value.dispose());
    this.shadows.forEach((value) => value.dispose());
    this.instances.clear();
    this.geometries.clear();
    this.materials.clear();
    this.textures.clear();
    this.shadows.clear();
  }
}
