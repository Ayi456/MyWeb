export class WindSystem {
  value = 0;
  active = false;
  update(dt: number) {
    this.value +=
      ((this.active ? 1 : 0) - this.value) *
      (1 - Math.exp(-dt * (this.active ? 1.25 : 0.75)));
    return this.value;
  }
}
