import { Redirect, useLocalSearchParams } from "expo-router";
// Keep legacy deep links working; each lesson now owns its inline practice experience.
export default function PracticeLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: "/lesson/[id]", params: { id } }} />;
}
