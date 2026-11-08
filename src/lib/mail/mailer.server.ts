// メールの送り方。送り先（transport）は MAIL_TRANSPORT で選ぶ。
// 今は開発用の console だけ。Cloudflare Email Service と SMTP は、それぞれのデプロイ先の PR で足す

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

export const MAIL_TRANSPORTS = ["console"] as const;
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

const transports: Record<MailTransportName, MailTransport> = {
	console: consoleTransport,
};

export const sendMail = (mail: Mail): Promise<void> =>
	transports[
		resolveMailTransport(process.env.MAIL_TRANSPORT, process.env.NODE_ENV)
	].send(mail);
