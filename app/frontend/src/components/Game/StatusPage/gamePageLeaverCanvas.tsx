import {allVar} from "../allVar";

const gamePageLeaverCanvas = (ctx: any, selectedMap: string) => {
	const color = selectedMap === "DESERT" ? "#063842" : "white";
	ctx.beginPath();
    ctx.font = "bold 2.5rem Rajdhani";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText("YOU WIN !", allVar.width / 2, allVar.height / 4);
    ctx.closePath();
    ctx.beginPath();
    ctx.font = "bold 2.5rem Rajdhani";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText("OPPONENT LEFT", allVar.width / 2, allVar.height / 3);
    ctx.closePath();
};

export default gamePageLeaverCanvas;