// 団体の中で、役割ごとにできること。サーバーの権限チェックと、画面の出し分けの両方で使う
// （画面で隠すのは見た目のためで、守りはサーバーのチェック）

export const MEMBER_ROLES = ["owner", "leader", "staff", "guest"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const ROLE_LABELS: Record<MemberRole, string> = {
	owner: "オーナー",
	leader: "リーダー",
	staff: "スタッフ",
	guest: "ゲスト",
};

export type OrgAction =
	/** シフトを見る */
	| "shift.view"
	/** シフトを作る・変える・消す */
	| "shift.edit"
	/** シフトを確定にする（確定したシフトを変える） */
	| "shift.confirm"
	/** メンバーの一覧を見る */
	| "member.view"
	/** 招待コードを発行・取り消す */
	| "invite.manage"
	/** メンバーの役割を変える・外す */
	| "member.manage"
	/** 団体の設定を変える */
	| "org.settings";

const ALLOWED: Record<OrgAction, readonly MemberRole[]> = {
	"shift.view": ["owner", "leader", "staff", "guest"],
	"shift.edit": ["owner", "leader"],
	"shift.confirm": ["owner", "leader"],
	"member.view": ["owner", "leader", "staff", "guest"],
	"invite.manage": ["owner", "leader"],
	"member.manage": ["owner"],
	"org.settings": ["owner"],
};

export const can = (role: MemberRole, action: OrgAction): boolean =>
	ALLOWED[action].includes(role);

/** 招待コードで渡せる役割。オーナーは招待では渡さない。リーダーが渡せるのはスタッフとゲストまで */
export const assignableInviteRoles = (role: MemberRole): MemberRole[] => {
	if (role === "owner") return ["leader", "staff", "guest"];
	if (role === "leader") return ["staff", "guest"];
	return [];
};

/** オーナーがメンバーに付けられる役割（オーナーの受け渡しは別の操作にする） */
export const assignableMemberRoles: readonly MemberRole[] = [
	"leader",
	"staff",
	"guest",
];
