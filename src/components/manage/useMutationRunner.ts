import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

export type MutationResult = { ok: boolean; errors?: string[] };
export type RunMutation = (
	action: () => Promise<MutationResult>,
) => Promise<boolean>;

/** 操作を 1 回行い、できたら画面を読み直す。失敗したらメッセージを errors に入れる */
export const useMutationRunner = () => {
	const router = useRouter();
	const [errors, setErrors] = useState<string[]>([]);
	const run: RunMutation = async (action) => {
		setErrors([]);
		try {
			const result = await action();
			if (!result.ok) {
				setErrors(result.errors ?? ["できませんでした"]);
				return false;
			}
			await router.invalidate();
			return true;
		} catch (error) {
			console.error(error);
			setErrors(["できませんでした。時間をおいて、もう一度試してください"]);
			return false;
		}
	};
	return { run, errors };
};
