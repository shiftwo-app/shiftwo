// メールの送り方。送り先（transport）は MAIL_TRANSPORT で選ぶ。
// console（開発用）はどこでも使える。cloudflare（Cloudflare Email Service）は Workers でだけ使える
// （中身は #platform にある）。SMTP はセルフホストの PR で足す
import { platform } from "#platform";

export type Mail = {
	to: string;
	subject: string;
	text: string;
	html?: string;
};

export interface MailTransport {
	send(mail: Mail): Promise<void>;
}

/** 送らずにターミナルへ出す（開発用）。本番では使わない */
const consoleTransport: MailTransport = {
	async send(mail) {
		console.info(
			`\n──── メール（MAIL_TRANSPORT=console のため送らずに表示）────\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n────────────────────────────────\n`,
		);
	},
};

export const MAIL_TRANSPORTS = ["console", "cloudflare"] as const;
export type MailTransportName = (typeof MAIL_TRANSPORTS)[number];

/** MAIL_TRANSPORT を読む。未設定なら、開発中は console、本番ではエラー（送れないまま動かさない） */
export const resolveMailTransport = (
	value: string | undefined,
	nodeEnv: string | undefined,
): MailTransportName => {
	if (value === undefined || value === "") {
		if (nodeEnv === "production") {
			throw new Error(
				"MAIL_TRANSPORT が設定されていません（本番ではメールの送り方を決めてください）",
			);
		}
		return "console";
	}
	if ((MAIL_TRANSPORTS as readonly string[]).includes(value)) {
		return value as MailTransportName;
	}
	throw new Error(
		`MAIL_TRANSPORT must be one of ${MAIL_TRANSPORTS.join(", ")} (got "${value}")`,
	);
};

const transportFor = (name: MailTransportName): MailTransport => {
	if (name === "console") return consoleTransport;
	const transport = platform.mailTransports[name];
	if (!transport) {
		throw new Error(
			`MAIL_TRANSPORT=${name} は、この動かし方（${platform.name}）では使えません`,
		);
	}
	return transport;
};

export const sendMail = (mail: Mail): Promise<void> =>
	transportFor(
		resolveMailTransport(process.env.MAIL_TRANSPORT, process.env.NODE_ENV),
	).send(mail);
