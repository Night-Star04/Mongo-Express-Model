import mongoose from "mongoose";
import fs from "fs";
import type { Models, ConnectOptions } from "mongoose";

export class mongoCilent {
	public Monogoose = mongoose;
	public Data: Map<string, Models>;

	private Connectton: boolean;
	private ConnectNumber: number;
	private MongoUrl: string;
	private cooldown: number;
	private CDdalay: number;
	private ModlePath: string;

	constructor(MongoUrl: string, ModlePath: string, dalay?: number) {
		this.Data = new Map();
		this.cooldown = new Date().getTime();
		this.Connectton = false;
		this.ConnectNumber = 0;
		this.CDdalay = dalay || 30;
		this.MongoUrl = MongoUrl;
		this.ModlePath = ModlePath;
		this.load();
	}

	private async load() {
		if (!fs.statSync(this.ModlePath).isDirectory())
			throw new Error("ModlePath is not a directory");
		const files = fs
			.readdirSync(this.ModlePath)
			.filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

		for (const file of files) {
			const model = require(`${this.ModlePath}\\${file}`);
			const { Name, Models } = model;
			if (typeof Name !== "string")
				throw new Error("ModleName is not a string");

			this.Data.set(Name, Models);
		}
	}

	public async Connect(options?: ConnectOptions) {
		if (this.ConnectNumber === 0) {
			await this.Monogoose.connect(this.MongoUrl, options)
				.then((mongoose) => {
					this.Connectton = true;

					// start listening
					const db = mongoose.connection;
					db.on("connecting", () => console.log("connecting to MongoDB..."));
					db.on("connected", () => console.log("connected to MongoDB!"));
					db.on("disconnected", async () => {
						console.log("disconnected from MongoDB!");
						this.Connectton = false;
						await this.Connect(options);
					});
					db.on("reconnected", () => {
						console.log("reconnected to MongoDB!");
						this.Connectton = true;
					});
					db.on("open", () => console.log("Connection to MongoDB"));
					db.on("error", async (error) => {
						console.error(error);
						this.Connectton = false;
						await this.Connect(options);
					});
				})
				.catch((err: any) => {
					this.Connectton = false;
					throw err;
				});
			console.log("Connected");
		} else if (this.ConnectNumber > 0) {
			const now = new Date().getTime();
			const amount = this.CDdalay * 1000;

			const expirationTime = this.cooldown + amount;

			if (now < expirationTime) {
				const timeLeft = (expirationTime - now) / 1000;

				console.log(`Reconnecting in ${timeLeft} seconds`);
				this.ConnectNumber++;
				return;
			}

			if (!this.Connectton) {
				await this.Monogoose.connect(this.MongoUrl, options)
					.then(() => {
						this.Connectton = true;
					})
					.catch((err) => {
						this.Connectton = false;
						throw err;
					});
			}

			this.cooldown = now;
		}
		this.ConnectNumber += 1;
	}
}
