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

/** 役割の強さ（大きいほど強い） */
const ROLE_RANK: Record<MemberRole, number> = {
	guest: 0,
	staff: 1,
	leader: 2,
	owner: 3,
};

/**
 * いくつかの役割のうち、いちばん強いものを返す（強い方が勝つ）。
 * テナントの日常シフトでは「団体の役割・テナントでの役割」、イベントでは「団体・テナント・イベントでの役割」を渡す。
 * テナントやイベントの役割で、団体の役割を弱めることはできない
 */
export const strongestRole = (
	base: MemberRole,
	...overrides: (MemberRole | null | undefined)[]
): MemberRole =>
	overrides.reduce<MemberRole>(
		(strongest, role) =>
			role && ROLE_RANK[role] > ROLE_RANK[strongest] ? role : strongest,
		base,
	);

/** テナント・イベントで割り当てられる役割（店長など。オーナーは団体だけ、ゲストは団体の参加の仕方なので割り当てない） */
export const SCOPED_ROLES: readonly MemberRole[] = ["leader", "staff"];

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
