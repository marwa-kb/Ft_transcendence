import { allVar } from "../allVar";

const gamePageLose = (ctx: any, selectedMap: string) => {
	const color = selectedMap === "DESERT" ? "#063842" : "white";
    ctx.beginPath();
    ctx.font = "bold 2.5rem Rajdhani";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText("YOU LOSE !", allVar.width / 2, allVar.height / 4);
    ctx.closePath();
};

export default gamePageLose;