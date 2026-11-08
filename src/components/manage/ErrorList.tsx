/** 操作のエラーを画面の上に出す */
const ErrorList = ({ errors }: { errors: string[] }) =>
	errors.length > 0 ? (
		<ul
			role="alert"
			className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800"
		>
			{errors.map((message) => (
				<li key={message}>{message}</li>
			))}
		</ul>
	) : null;

export default ErrorList;
