export class WindSystem {
  value = 0;
  active = false;
  cloudTravel = 0;
  birdLag = 0;
  millTurn = 0;
  update(dt: number, motionScale = 1) {
    this.value +=
      ((this.active ? 1 : 0) - this.value) *
      (1 - Math.exp(-dt * (this.active ? 1.25 : 0.75)));
    const breeze = this.value * motionScale;
    this.cloudTravel += dt * breeze * 0.45;
    this.birdLag += dt * breeze * 0.055;
    this.millTurn += dt * breeze * 1.4;
    return this.value;
  }
}
